package pe.sanagustin.portal.dto;
import java.time.LocalDate;

public record GenerarCuotasRequest(
    Long idConcepto,
    String grado,
    LocalDate fechaVencimiento
) {}
