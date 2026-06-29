package pe.sanagustin.portal.config;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import pe.sanagustin.portal.security.JwtAuthFilter;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                // Deshabilitar CSRF (usamos JWT stateless, no sesiones)
                .csrf(AbstractHttpConfigurer::disable)

                // Habilitar CORS usando nuestra configuración de bean
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))

                // Sin estado de sesión: cada request debe traer su JWT
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))

                // Devolver 401 (no 302/redirect) cuando la autenticación falta
                .exceptionHandling(e -> e
                        .authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED))
                )

                .authorizeHttpRequests(auth -> auth
                        // Autenticación pública y páginas de error internas
                        .requestMatchers("/api/auth/**", "/error").permitAll()

                        // Preflight CORS: OPTIONS siempre libre
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()

                        // WebSocket handshake: SockJS necesita acceso libre al endpoint /ws
                        .requestMatchers("/ws/**").permitAll()

                        .requestMatchers("/api/portal/docente/**").hasAnyAuthority("ROLE_MAESTRO", "MAESTRO", "ROLE_DOCENTE", "DOCENTE", "ROLE_PROFESOR", "PROFESOR")
                        .requestMatchers("/api/portal/alumno/**").hasRole("ALUMNO")
                        .requestMatchers("/api/portal/padre/**").hasAnyAuthority("ROLE_PADRE", "PADRE")
                        .requestMatchers("/api/admin/**", "/api/portal/admin/**").hasAnyAuthority("ROLE_ADMIN", "ADMIN")

                        // Cualquier otra ruta requiere autenticación
                        .anyRequest().authenticated()
                )

                // Inyectar nuestro filtro JWT antes del filtro de usuario/contraseña
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();

        // Orígenes permitidos: frontend en desarrollo y producción Docker
        config.setAllowedOrigins(List.of(
                "http://localhost:4200",
                "http://127.0.0.1:4200",
                "http://localhost",
                "http://127.0.0.1"
        ));

        // Métodos HTTP permitidos (incluye OPTIONS para preflight)
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));

        // Cabeceras permitidas: Authorization es clave
        config.setAllowedHeaders(List.of("*"));

        // Exponer cabeceras al cliente Angular (necesario para leer Authorization en respuestas)
        config.setExposedHeaders(List.of("Authorization"));

        // Permitir envío de credenciales/cookies
        config.setAllowCredentials(true);

        // Cache de preflight: 1 hora
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
