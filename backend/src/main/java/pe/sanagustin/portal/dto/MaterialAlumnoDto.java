package pe.sanagustin.portal.dto;

public record MaterialAlumnoDto(
    Long idMaterial,
    Integer semana,
    Integer clase,
    String titulo,
    String tipo,
    String url,
    String fechaCreacion
) {}
