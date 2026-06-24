package pe.sanagustin.portal.dto;

import java.util.List;

/**
 * DTO completo de un mensaje: incluye el cuerpo y el hilo de respuestas.
 * Se usa cuando el docente abre un mensaje concreto.
 * Al obtener este DTO, el mensaje se marca automáticamente como leído.
 */
public record MensajeDetalleDto(
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
        String cuerpo,
        List<RespuestaResumenDto> respuestas
) {}
