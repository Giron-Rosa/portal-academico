package pe.sanagustin.portal.dto;

/**
 * DTO para representar un docente disponible al que el padre puede enviar un mensaje.
 */
public record DocenteDisponibleDto(
        long   idMaestro,
        String nombreMaestro,
        String curso,
        String nombreAlumno,
        long   idAlumno,
        long   idAulaCurso
) {}
