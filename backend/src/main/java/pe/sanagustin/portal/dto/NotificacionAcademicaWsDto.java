package pe.sanagustin.portal.dto;

public record NotificacionAcademicaWsDto(
        String tipo,          // "NUEVA_TAREA", "NUEVO_EXAMEN", "NUEVO_MATERIAL", "NUEVA_NOTA"
        String titulo,
        String descripcion,
        String curso,
        String fecha
) {}
