package pe.sanagustin.portal.dto;

public record InsigniaDto(
        Long id,
        String nombre,
        String descripcion,
        String icono,
        String fechaDesbloqueo
) {}
