package pe.sanagustin.portal.dto;

public record ReporteDto(
        long    id,
        String  tipo,           // pendiente | anotacion | llamada_atencion | felicitacion | otro
        String  titulo,
        String  descripcion,
        String  fecha,          // "DD/MM/YYYY"
        boolean visiblePadre,
        String  fechaCreacion
) {}
