package pe.sanagustin.portal.dto;

import java.time.LocalDate;
import java.time.LocalTime;

public record EventoInstitucionalDto(
    Long idEvento,
    String tipo,
    String titulo,
    LocalDate fecha,
    LocalTime horaInicio,
    LocalTime horaFin,
    String lugar,
    String descripcion,
    String creadoPor
) {}
