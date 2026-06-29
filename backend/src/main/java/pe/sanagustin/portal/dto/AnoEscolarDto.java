package pe.sanagustin.portal.dto;

public record AnoEscolarDto(
        Long idAno,
        String nombre,
        String fechaInicio,
        String fechaFin,
        boolean activo
) {}
