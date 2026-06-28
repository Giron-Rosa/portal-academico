package pe.sanagustin.portal.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import pe.sanagustin.portal.entity.EspacioReserva;
import java.util.List;
import java.util.Optional;

@Repository
public interface EspacioReservaRepository extends JpaRepository<EspacioReserva, Long> {

    @Query("SELECT e FROM EspacioReserva e WHERE e.area IN :areas OR e.area = 'General'")
    List<EspacioReserva> findByAreasOrGeneral(@Param("areas") List<String> areas);

    Optional<EspacioReserva> findByNombre(String nombre);
}
