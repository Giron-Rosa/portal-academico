package pe.sanagustin.portal.dto;
import java.math.BigDecimal;

public record ConceptoPagoDto(
    Long idConcepto,
    String nombre,
    String descripcion,
    BigDecimal monto,
    Boolean activo
) {}
