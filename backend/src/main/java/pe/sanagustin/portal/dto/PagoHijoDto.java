package pe.sanagustin.portal.dto;

public record PagoHijoDto(
    String concepto,
    double monto,
    String fechaVencimiento,
    String estado,      // "PAGADO", "PENDIENTE", "VENCIDO"
    String fechaPago,   // null si no se pagó
    String documento    // Boleta/recibo, null si no se pagó
) {}
