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

    @Override
    public void run(String... args) {
        List<Usuario> usuarios = usuarioRepository.findAll();
        for (Usuario u : usuarios) {
            u.setContrasenaHash(passwordEncoder.encode("password"));
            usuarioRepository.save(u);
            log.info("Hash actualizado para usuario: {} ({})", u.getCodigo(), u.getRol());
        }
        log.info("DataInitializer: Todos los usuarios actualizados con contraseña 'password'");
    }
}
