package pe.sanagustin.portal.dto;

import java.util.List;

public record ConsolidadoMensualDto(
    List<String> fechas,
    List<AlumnoConsolidadoDto> alumnos
) {}
