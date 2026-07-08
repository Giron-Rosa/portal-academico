package pe.sanagustin.portal.dto;

import java.util.List;

/**
 * DTO para el detalle ampliado de un curso del hijo.
 * Incluye tareas y exámenes individuales con sus notas.
 */
public record CursoDetalleHijoDto(
        String  nombre,
        String  area,
        String  docente,
        int     progreso,
        int     tareasEntregadas,
        int     totalTareas,
        double  promedioCurso,
        double  asistenciaCurso,
        List<TareaHijoDto>   tareas,
        List<ExamenHijoDto>  examenes
) {}
