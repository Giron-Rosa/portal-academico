package pe.sanagustin.portal.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pe.sanagustin.portal.entity.Aula;

@Repository
public interface AulaRepository extends JpaRepository<Aula, Long> {
}
