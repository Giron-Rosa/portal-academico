package pe.sanagustin.portal.dto;

public record CursoDocenteDto(
        String  nombre,
        String  grado,
        String  seccion,
        Integer horasSemana,
        String  turno,
        String  periodo,
        Long    totalAlumnos
) {}
