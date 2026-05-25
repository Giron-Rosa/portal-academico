package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import pe.sanagustin.portal.dto.LoginRequest;
import pe.sanagustin.portal.dto.LoginResponse;
import pe.sanagustin.portal.dto.RegistroRequest;
import pe.sanagustin.portal.entity.Usuario;
import pe.sanagustin.portal.enums.RolUsuario;
import pe.sanagustin.portal.repository.UsuarioRepository;
import pe.sanagustin.portal.security.JwtUtil;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EntityManager entityManager;

    public LoginResponse login(LoginRequest request) {
        Usuario usuario = usuarioRepository.findByCodigo(request.getIdentifier())
                .or(() -> usuarioRepository.findByEmail(request.getIdentifier()))
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado"));

        if (!usuario.getActivo()) {
            throw new BadCredentialsException("Cuenta desactivada");
        }

        if (!passwordEncoder.matches(request.getContrasena(), usuario.getContrasenaHash())) {
            throw new BadCredentialsException("Contraseña incorrecta");
        }

        usuario.setUltimoAcceso(LocalDateTime.now());
        usuarioRepository.save(usuario);

        String nombre = resolveNombre(usuario);
        String token  = jwtUtil.generateToken(usuario.getCodigo(), usuario.getRol().name());

        return new LoginResponse(
                token,
                usuario.getRol().name(),
                usuario.getCodigo(),
                usuario.getEmail(),
                nombre
        );
    }

    @org.springframework.transaction.annotation.Transactional
    public void registrarUsuario(RegistroRequest request) {
        if (usuarioRepository.findByCodigo(request.getCodigo()).isPresent()) {
            throw new IllegalArgumentException("El código de usuario ya está registrado.");
        }
        if (usuarioRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new IllegalArgumentException("El correo electrónico ya está registrado.");
        }

        Usuario usuario = new Usuario();
        usuario.setCodigo(request.getCodigo().trim());
        usuario.setEmail(request.getEmail().trim());
        usuario.setContrasenaHash(passwordEncoder.encode(request.getContrasena()));
        try {
            usuario.setRol(RolUsuario.valueOf(request.getRol().toLowerCase().trim()));
        } catch (Exception e) {
            throw new IllegalArgumentException("Rol inválido. Roles válidos: alumno, padre, maestro, admin");
        }
        usuario.setActivo(true);
        usuarioRepository.save(usuario);
    }

    private String resolveNombre(Usuario u) {
        String tabla = switch (u.getRol()) {
            case maestro -> "maestros";
            case alumno  -> "alumnos";
            case padre   -> "padres";
            default      -> null;
        };
        if (tabla == null) return u.getCodigo();
        try {
            Object[] row = (Object[]) entityManager
                    .createNativeQuery("SELECT nombre, apellido FROM " + tabla + " WHERE id_usuario = :id")
                    .setParameter("id", u.getIdUsuario())
                    .getSingleResult();
            return row[0] + " " + row[1];
        } catch (Exception e) {
            return u.getCodigo();
        }
    }
}
