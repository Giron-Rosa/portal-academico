package pe.sanagustin.portal.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import pe.sanagustin.portal.entity.Usuario;
import pe.sanagustin.portal.repository.UsuarioRepository;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        // Inicializar tabla planes_apoyo de forma segura una sola vez
        try {
            jdbcTemplate.execute("""
                CREATE TABLE IF NOT EXISTS planes_apoyo (
                    id_plan        SERIAL PRIMARY KEY,
                    id_alumno      INT NOT NULL,
                    id_maestro     INT NOT NULL,
                    plan_json      TEXT NOT NULL,
                    checks_state   VARCHAR(100) NOT NULL DEFAULT '0,0,0',
                    feedback_1     TEXT,
                    feedback_2     TEXT,
                    feedback_3     TEXT,
                    fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW()
                )
            """);
            jdbcTemplate.execute("ALTER TABLE planes_apoyo ADD COLUMN IF NOT EXISTS asistencia_reg DOUBLE PRECISION DEFAULT 0.0");
            jdbcTemplate.execute("ALTER TABLE planes_apoyo ADD COLUMN IF NOT EXISTS promedio_reg DOUBLE PRECISION DEFAULT 0.0");
            
            // Columnas para transcripción y análisis de IA en mensajes
            jdbcTemplate.execute("ALTER TABLE mensajes_respuestas ADD COLUMN IF NOT EXISTS transcripcion TEXT");
            jdbcTemplate.execute("ALTER TABLE mensajes_respuestas ADD COLUMN IF NOT EXISTS sentimiento VARCHAR(50)");
            jdbcTemplate.execute("ALTER TABLE mensajes_respuestas ADD COLUMN IF NOT EXISTS analisis_causa TEXT");
            
            jdbcTemplate.execute("ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS transcripcion TEXT");
            jdbcTemplate.execute("ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS sentimiento VARCHAR(50)");
            jdbcTemplate.execute("ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS analisis_causa TEXT");
            
            log.info("DataInitializer: Estructura de tablas y columnas IA verificada/inicializada");
        } catch (Exception e) {
            log.error("DataInitializer: Error al verificar/inicializar base de datos", e);
        }

        List<Usuario> usuarios = usuarioRepository.findAll();
        for (Usuario u : usuarios) {
            u.setContrasenaHash(passwordEncoder.encode("password"));
            usuarioRepository.save(u);
            log.info("Hash actualizado para usuario: {} ({})", u.getCodigo(), u.getRol());
        }
        log.info("DataInitializer: Todos los usuarios actualizados con contraseña 'password'");
    }
}
