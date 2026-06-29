package pe.sanagustin.portal.dto;

public record CursoHijoDto(
        String  nombre,
        String  area,
        Integer horasSemana,
        String  docente,
        int     progreso,
        int     tareasEntregadas,
        int     totalTareas,
        double  promedioCurso,
        double  asistenciaCurso
) {}
