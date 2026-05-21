package pe.sanagustin.portal.dto;

import java.util.List;

/** Sesión de asistencia para una fecha concreta. */
public record SesionAsistenciaDto(
        String                    fecha,          // "YYYY-MM-DD"
        int                       totalPresentes,
        int                       totalFaltas,
        int                       totalTardanzas,
        int                       totalJustificados,
        List<AsistenciaAlumnoDto> alumnos
) {}
