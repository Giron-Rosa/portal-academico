package pe.sanagustin.portal.dto;

/**
 * Datos de un comunicado para mostrar en la lista del panel Refuerzos.
 * id_aula = null → el comunicado aplica a todos los grados del docente.
 */
public record ComunicadoDto(
    long   id,
    String titulo,
    String descripcion,
    String tipo,
    String fechaEvento,    // "DD/MM/YYYY" o null si no aplica
    String fechaCreacion,  // "DD/MM/YYYY HH24:MI"
    String grado,          // nombre del grado  o  "Todos los grados"
    String seccion,        // "A", "B"…         o  null si es general
    Long   idAula          // null si es comunicado general
) {}
