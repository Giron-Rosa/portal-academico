package pe.sanagustin.portal.dto;

public record MisionDto(
        Long id,
        String titulo,
        String descripcion,
        String icono,
        int progreso,
        boolean completado,
        String categoria
) {}
