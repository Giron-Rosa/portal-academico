package pe.sanagustin.portal.dto;

/**
 * Representa un material didáctico dentro de una semana/clase del curso.
 * tipo: pdf | word | video | url | youtube
 */
public record MaterialDto(
        long   id,
        int    semana,
        int    clase,
        String titulo,
        String tipo,
        String url,            // null si es archivo sin enlace externo
        String fechaCreacion   // "DD/MM/YYYY"
) {}
