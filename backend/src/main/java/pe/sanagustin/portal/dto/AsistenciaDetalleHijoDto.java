package pe.sanagustin.portal.dto;

import java.util.List;

public record AsistenciaDetalleHijoDto(
    List<AsistenciaHijoDto> historial,
    int total,
    int presente,
    int tardanza,
    int falta,
    int justificado,
    double porcentaje
) {}
