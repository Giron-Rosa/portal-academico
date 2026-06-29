package pe.sanagustin.portal.dto;
import java.math.BigDecimal;
import java.time.LocalDate;

public record CuotaEstudianteDto(
    Long idCuota,
    Long idEstudiante,
    String estudianteNombre,
    String estudianteApellido,
    String estudianteCodigo,
    Long idConcepto,
    String conceptoNombre,
    BigDecimal monto,
    LocalDate fechaVencimiento,
    Boolean pagado,
    String fechaPago,
    String nroTransaccion
) {}
