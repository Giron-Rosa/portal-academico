package pe.sanagustin.portal.dto;

public record RecursoDto(
        Long   idRecurso,
        String nombre,
        String descripcion,
        String url,
        String categoria,
        String tipo
) {}
