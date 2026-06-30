package pe.sanagustin.portal.dto;

public record CrearAsignacionRequest(
    Long idCurso,
    Long idAula,
    Integer horasSemana,
    Long idMaestro
) {}
