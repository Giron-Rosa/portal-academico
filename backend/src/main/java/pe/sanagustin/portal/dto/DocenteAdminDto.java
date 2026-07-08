package pe.sanagustin.portal.dto;

public record DocenteAdminDto(
        Long idMaestro,
        String codigo,
        String nombre,
        String apellido,
        String especialidad,
        String email,
        String departamento,
        boolean activo
) {}
