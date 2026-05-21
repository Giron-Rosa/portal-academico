package pe.sanagustin.portal.dto;

/**
 * Información de una tarea incluyendo estadísticas de entrega.
 */
public record TareaDto(
        long    id,
        int     numeroTarea,
        int     semana,
        int     clase,
        String  titulo,
        String  descripcion,
        String  tipoEntregable,
        String  fechaEntrega,      // "DD/MM/YYYY" o null
        int     notaMaxima,
        int     intentos,
        String  url,
        String  fechaCreacion,     // "DD/MM/YYYY"
        int     totalAlumnos,
        int     entregadas,
        int     noEntregadas
) {}
