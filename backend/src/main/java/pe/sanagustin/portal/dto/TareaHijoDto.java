package pe.sanagustin.portal.dto;

/**
 * Tarea individual de un alumno con su estado de entrega y nota.
 */
public record TareaHijoDto(
        long    idTarea,
        String  titulo,
        String  fechaEntrega,
        boolean entregado,
        Double  nota,      // null si aún no calificada
        int     notaMaxima
) {}
