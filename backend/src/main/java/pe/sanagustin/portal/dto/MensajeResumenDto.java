package pe.sanagustin.portal.dto;

/**
 * DTO para mostrar un mensaje en la lista (bandeja de entrada).
 * No incluye el cuerpo completo ni las respuestas para aligerar la carga.
 *
 * @param id              ID del mensaje
 * @param asunto          Línea de asunto
 * @param tipo            "justificante" | "consulta" | "otro"
 * @param leido           true si el docente ya lo leyó
 * @param fechaEnvio      Fecha/hora formateada "DD/MM/YYYY HH:MM"
 * @param nombrePadre     Nombre completo del padre remitente
 * @param nombreAlumno    Nombre completo del alumno relacionado (puede ser null)
 * @param idAlumno        ID del alumno (para cargar contexto lateral)
 * @param grado           Nombre del grado (ej. "5to Secundaria"), puede ser null
 * @param seccion         Letra de la sección (ej. "B"), puede ser null
 * @param curso           Nombre del curso relacionado (ej. "Matemática"), puede ser null
 * @param cantRespuestas  Número de respuestas en el hilo
 * @param ultimaRespuesta Extracto de la última respuesta o mensaje
 */
public record MensajeResumenDto(
        long   id,
        String asunto,
        String tipo,
        boolean leido,
        String fechaEnvio,
        String nombrePadre,
        String nombreAlumno,
        Long   idAlumno,
        String grado,
        String seccion,
        String curso,
        int    cantRespuestas,
        String ultimaRespuesta
) {}
