package pe.sanagustin.portal.dto;

public record CursoAlumnoDto(
        String nombre,
        String area,
        Integer horasSemana,
        String grado,
        String seccion,
        String turno,
        String periodo,
        String docente
) {}
