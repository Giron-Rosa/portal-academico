package pe.sanagustin.portal.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pe.sanagustin.portal.entity.PlanApoyo;

import java.util.List;
import java.util.Optional;

@Repository
public interface PlanApoyoRepository extends JpaRepository<PlanApoyo, Long> {
    Optional<PlanApoyo> findByIdAlumnoAndIdMaestro(Integer idAlumno, Integer idMaestro);
    void deleteByIdAlumnoAndIdMaestro(Integer idAlumno, Integer idMaestro);
    List<PlanApoyo> findByChecksState(String checksState);
}
