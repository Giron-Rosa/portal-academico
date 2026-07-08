package pe.sanagustin.portal.dto;

public record UltimoPagoDto(
    Long idCuota,
    String estudianteNombre,
    String conceptoNombre,
    Double monto,
    String fechaPago,
    String nroTransaccion
) {}
