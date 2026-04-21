package pe.sanagustin.portal.dto;

public record CursoHijoDto(
        String  nombre,
        String  area,
        Integer horasSemana,
        String  docente
) {}
