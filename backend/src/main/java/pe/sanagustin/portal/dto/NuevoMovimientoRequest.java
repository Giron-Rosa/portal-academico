package pe.sanagustin.portal.dto;

public record NuevoMovimientoRequest(
        String tipo,
        Long idCategoria,
        String descripcion,
        java.math.BigDecimal monto,
        String fecha,
        String referencia
) {}
