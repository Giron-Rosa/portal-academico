package pe.sanagustin.portal.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.sanagustin.portal.entity.Usuario;

import java.util.Optional;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {
    Optional<Usuario> findByCodigo(String codigo);
    Optional<Usuario> findByEmail(String email);
}
