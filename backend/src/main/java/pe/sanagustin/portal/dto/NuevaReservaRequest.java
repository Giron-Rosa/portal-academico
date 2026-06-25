package pe.sanagustin.portal.dto;

/**
 * Request para crear una nueva reserva de espacio.
 */
public record NuevaReservaRequest(
        String  espacio,
        String  fecha,
        String  horaInicio,
        String  horaFin,
        Long    idAulaCurso,
        String  proposito
) {}
