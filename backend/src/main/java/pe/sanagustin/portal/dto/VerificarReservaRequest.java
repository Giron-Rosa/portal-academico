package pe.sanagustin.portal.dto;

/**
 * Request para verificar si un espacio está disponible en un rango horario.
 */
public record VerificarReservaRequest(
        String espacio,
        String fecha,
        String horaInicio,
        String horaFin
) {}
