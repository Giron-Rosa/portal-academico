package pe.sanagustin.portal.dto;

/**
 * Examen individual de un alumno con asistencia y nota.
 */
public record ExamenHijoDto(
        long    idExamen,
        String  titulo,
        String  tipo,
        String  fechaExamen,
        boolean asistio,
        Double  nota,      // null si aún no calificada
        int     notaMaxima
) {}
