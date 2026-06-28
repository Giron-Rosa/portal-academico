package pe.sanagustin.portal.dto;

public record TareaAlumnoDto(
    Long idTarea,
    Integer numeroTarea,
    Integer semana,
    Integer clase,
    String titulo,
    String descripcion,
    String tipoEntregable,
    String fechaEntrega,
    Integer notaMaxima,
    Double nota,
    Boolean entregado
) {}
