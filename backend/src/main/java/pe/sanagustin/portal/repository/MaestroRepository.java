package pe.sanagustin.portal.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pe.sanagustin.portal.entity.Maestro;
import java.util.Optional;

@Repository
public interface MaestroRepository extends JpaRepository<Maestro, Long> {
    Optional<Maestro> findByUsuarioCodigo(String codigo);
}
