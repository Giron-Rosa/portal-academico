package pe.sanagustin.portal.dto;

import java.util.List;

/**
 * Agrupa los reportes de un alumno para un aula_curso dado.
 * Devuelto al docente (incluye reportes no visibles al padre).
 */
public record AlumnoReportesDto(
        long          idAlumno,
        String        codigo,
        String        nombres,
        int           totalReportes,
        List<ReporteDto> reportes
) {}
