package pe.sanagustin.portal.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pe.sanagustin.portal.entity.EventoInstitucional;

@Repository
public interface EventoInstitucionalRepository extends JpaRepository<EventoInstitucional, Long> {
}
