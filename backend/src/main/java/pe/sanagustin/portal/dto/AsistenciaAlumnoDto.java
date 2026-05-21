package pe.sanagustin.portal.dto;

public record AsistenciaAlumnoDto(
        Long   idAsistencia,   // null si no existe registro para esa fecha todavía
        long   idAlumno,
        String codigo,
        String nombres,
        String estado,         // presente | falta | tardanza | justificado
        String justificante
) {}
