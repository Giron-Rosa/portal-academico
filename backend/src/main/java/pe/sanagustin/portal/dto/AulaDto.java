package pe.sanagustin.portal.dto;

/**
 * Representa una aula (grado + sección) asignada al docente.
 * Se usa para poblar el selector de grado al crear un comunicado.
 */
public record AulaDto(
    long   id,
    String grado,
    String seccion
) {}
