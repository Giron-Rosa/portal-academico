package pe.sanagustin.portal.dto;

public record GuardarPadreRequest(
        String nombre,
        String apellido,
        String email,
        String telefono,
        String dni
) {}
