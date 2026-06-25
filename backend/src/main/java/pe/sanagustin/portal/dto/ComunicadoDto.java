package pe.sanagustin.portal.dto;

import java.util.List;

/**
 * Datos de un comunicado para mostrar en la lista del panel Refuerzos.
 * idAulas vacía → comunicado general (todos los grados del docente).
 */
public record ComunicadoDto(
    long         id,
    String       titulo,
    String       descripcion,
    String       tipo,
    String       fechaEvento,    // "DD/MM/YYYY" o null
    String       horaEvento,     // "HH:MM"      o null
    String       fechaCreacion,  // "DD/MM/YYYY HH24:MI"
    String       grado,          // primer grado o "Todos los grados" (para compatibilidad)
    String       seccion,        // primera sección o null
    Long         idAula,         // primer idAula o null (compat)
    List<Long>   idAulas         // lista de todas las aulas destino
) {}
