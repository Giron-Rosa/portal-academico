package pe.sanagustin.portal.dto;

public record EventoHijoDto(
    long id,
    String titulo,
    String descripcion,
    String tipo,
    String fechaEvento,
    String horaEvento,
    String fechaCreacion,
    String docente
) {}
