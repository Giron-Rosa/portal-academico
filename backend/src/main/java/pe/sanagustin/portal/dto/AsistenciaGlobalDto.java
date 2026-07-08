package pe.sanagustin.portal.dto;

public record AsistenciaGlobalDto(
    Long idAulaCurso,
    String curso,
    Integer total,
    Integer presente,
    Integer tardanza,
    Integer falta,
    Integer justificado,
    Double porcentaje
) {}
