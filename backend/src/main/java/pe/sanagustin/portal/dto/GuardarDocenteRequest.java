package pe.sanagustin.portal.dto;

public record GuardarDocenteRequest(
        String nombre,
        String apellido,
        String email,
        String especialidad,
        String departamento,
        String dni,
        String telefono
) {}
