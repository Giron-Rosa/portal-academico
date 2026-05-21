package pe.sanagustin.portal.dto;

/**
 * Registro de nota/entrega de un alumno para una tarea concreta.
 */
public record NotaTareaDto(
        long    idNota,
        long    idAlumno,
        String  codigo,
        String  nombres,        // "Apellido Nombre"
        boolean entregado,
        Double  nota            // null si no fue calificado aún
) {}
