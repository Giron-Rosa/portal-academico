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

    private static final String TEST_PASSWORD = "Test1234!";

    @Override
    public void run(String... args) {
        List<Usuario> usuarios = usuarioRepository.findAll();

        long actualizados = usuarios.stream()
                .filter(u -> !u.getContrasenaHash().startsWith("$2a$") &&
                             !u.getContrasenaHash().startsWith("$2b$"))
                .peek(u -> {
                    u.setContrasenaHash(passwordEncoder.encode(TEST_PASSWORD));
                    usuarioRepository.save(u);
                    log.info("Hash actualizado para usuario: {} ({})", u.getCodigo(), u.getRol());
                })
                .count();

        if (actualizados > 0) {
            log.info("DataInitializer: {} hash(es) actualizados con BCrypt. Password de prueba: '{}'",
                    actualizados, TEST_PASSWORD);
        }
    }
}
