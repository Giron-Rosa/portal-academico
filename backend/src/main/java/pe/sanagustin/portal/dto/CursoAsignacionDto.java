package pe.sanagustin.portal.dto;

public record CursoAsignacionDto(
    Long idAulaCurso,
    Long idCurso,
    String cursoNombre,
    String area,
    Long idAula,
    String gradoNombre,
    String seccionNombre,
    Integer horasSemana,
    Long idMaestro,
    String docenteNombre
) {}
