package pe.sanagustin.portal.dto;

/**
 * DTO que representa una respuesta dentro del hilo de un mensaje.
 *
 * @param id          ID de la respuesta
 * @param cuerpo      Texto de la respuesta
 * @param fecha       Fecha/hora formateada "DD/MM/YYYY HH:MM"
 * @param nombreAutor Nombre completo de quien respondió
 * @param esMaestro   true si el autor es el docente, false si es el padre
 */
public record RespuestaResumenDto(
        long   id,
        String cuerpo,
        String fecha,
        String nombreAutor,
        boolean esMaestro
) {}
