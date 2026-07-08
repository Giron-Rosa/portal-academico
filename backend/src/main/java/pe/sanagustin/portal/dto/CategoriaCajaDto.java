package pe.sanagustin.portal.dto;

public record CategoriaCajaDto(
        Long idCategoria,
        String nombre,
        String tipo,
        String descripcion,
        boolean activo
) {}
