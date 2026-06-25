package pe.sanagustin.portal.dto;

/**
 * Respuesta de verificación de disponibilidad de un espacio.
 */
public record DisponibilidadResponse(
        boolean disponible,
        String  mensaje
) {}
