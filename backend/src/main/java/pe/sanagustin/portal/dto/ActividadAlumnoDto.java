package pe.sanagustin.portal.dto;

public record ActividadAlumnoDto(
    Long idExamen,
    Integer numeroExamen,
    Integer semana,
    String titulo,
    String descripcion,
    String tipo,
    String fechaExamen,
    Integer duracionMinutos,
    Integer notaMaxima,
    Double nota,
    Boolean asistio
) {}
