package pe.sanagustin.portal.dto;

import java.util.List;

public record AsistenciaCursoDto(
    List<AsistenciaRegistroDto> historial,
    Integer totalClases,
    Integer clasesPresente,
    Integer clasesTardanza,
    Integer clasesFalta,
    Integer clasesJustificado,
    Double porcentajeAsistencia
) {}
