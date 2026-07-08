package pe.sanagustin.portal.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import pe.sanagustin.portal.entity.NotaKanban;
import java.util.List;

public interface NotaKanbanRepository extends JpaRepository<NotaKanban, Long> {
    List<NotaKanban> findAllByOrderByFechaCreacionDesc();
}
