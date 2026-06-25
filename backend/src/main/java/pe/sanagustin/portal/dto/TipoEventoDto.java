package pe.sanagustin.portal.dto;

/** Tipo de evento disponible en el formulario de comunicados. */
public record TipoEventoDto(
        long   id,
        String nombre,
        String colorFondo,
        String colorTexto
) {}
