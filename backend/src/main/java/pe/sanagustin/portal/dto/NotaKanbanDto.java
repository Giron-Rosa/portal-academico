package pe.sanagustin.portal.dto;

import java.time.LocalDate;

public record NotaKanbanDto(
        Long idNota,
        String titulo,
        String descripcion,
        String prioridad,
        String estado,
        String responsable,
        LocalDate fechaLimite,
        String etiquetas
) {}
