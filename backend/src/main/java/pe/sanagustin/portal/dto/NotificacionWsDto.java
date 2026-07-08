package pe.sanagustin.portal.dto;

/**
 * Payload enviado por WebSocket a los suscriptores cuando ocurre
 * un evento de mensajería relevante (nuevo mensaje o nueva respuesta).
 *
 * @param tipo        "NUEVO_MENSAJE" | "NUEVA_RESPUESTA"
 * @param idMensaje   ID del mensaje afectado
 * @param asunto      Asunto del hilo (para mostrar en la notificación)
 * @param remitente   Nombre de quien envió el mensaje o la respuesta
 * @param preview     Primeros 80 caracteres del cuerpo para la vista previa
 * @param destinatario Código de usuario destinatario (docente o padre)
 */
public record NotificacionWsDto(
        String tipo,
        long   idMensaje,
        String asunto,
        String remitente,
        String preview,
        String destinatario
) {}
