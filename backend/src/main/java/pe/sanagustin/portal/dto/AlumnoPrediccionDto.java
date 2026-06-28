package pe.sanagustin.portal.dto;

public record AlumnoPrediccionDto(
    Long   idAlumno,
    String nombre,
    String apellido,
    Long   idAulaCurso,
    String curso,
    String grado,
    String seccion,
    Integer totalClases,
    Integer clasesPresente,
    Double promedio
) {}
