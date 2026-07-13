package pe.sanagustin.portal.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import pe.sanagustin.portal.entity.StudentNote;

import java.util.List;

@Repository
public interface StudentNoteRepository extends JpaRepository<StudentNote, Long> {
    List<StudentNote> findByAlumnoIdAlumnoOrderByFechaActualizacionDesc(Long idAlumno);
}
