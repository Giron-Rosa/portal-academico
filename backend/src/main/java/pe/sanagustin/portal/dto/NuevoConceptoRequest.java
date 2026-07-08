package pe.sanagustin.portal.dto;
import java.math.BigDecimal;

public record NuevoConceptoRequest(
    String nombre,
    String descripcion,
    BigDecimal monto,
    Boolean activo
) {}
