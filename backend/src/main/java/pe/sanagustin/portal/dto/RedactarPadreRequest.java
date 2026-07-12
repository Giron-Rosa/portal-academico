package pe.sanagustin.portal.dto;

public record RedactarPadreRequest(
    String texto,
    String nombreAlumno,
    String nombreDestinatario,
    String relacion
) {}
