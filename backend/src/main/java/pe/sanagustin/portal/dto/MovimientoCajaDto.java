package pe.sanagustin.portal.dto;

public record MovimientoCajaDto(
        Long idMovimiento,
        String tipo,
        Long idCategoria,
        String categoriaNombre,
        String descripcion,
        java.math.BigDecimal monto,
        String fecha,
        String referencia
) {}
