package pe.sanagustin.portal.dto;

public record RedactarMensajeRequest(
    String texto,
    String nombreAlumno,
    String nombreDestinatario
) {}
