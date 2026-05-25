package pe.sanagustin.portal.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pe.sanagustin.portal.entity.Padre;
import java.util.Optional;

@Repository
public interface PadreRepository extends JpaRepository<Padre, Long> {
    Optional<Padre> findByUsuarioCodigo(String codigo);
}
