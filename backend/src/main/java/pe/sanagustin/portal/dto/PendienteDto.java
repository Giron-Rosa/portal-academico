package pe.sanagustin.portal.dto;

public record PendienteDto(
        long   idAulaCurso,
        String tipo,          // "tarea" | "examen"
        String grado,
        String seccion,
        String curso,
        String titulo,
        int    sinCalificar,
        int    totalAlumnos
) {}
