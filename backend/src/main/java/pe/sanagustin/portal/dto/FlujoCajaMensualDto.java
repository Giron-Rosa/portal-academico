package pe.sanagustin.portal.dto;

public record FlujoCajaMensualDto(
        int anio,
        int mes,
        java.math.BigDecimal totalIngresos,
        java.math.BigDecimal totalGastos,
        java.math.BigDecimal saldo
) {}
