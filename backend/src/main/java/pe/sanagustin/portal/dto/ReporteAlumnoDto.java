package pe.sanagustin.portal.dto;

public record ReporteAlumnoDto(
    Long idReporte,
    String tipo,
    String titulo,
    String descripcion,
    String fecha
) {}
