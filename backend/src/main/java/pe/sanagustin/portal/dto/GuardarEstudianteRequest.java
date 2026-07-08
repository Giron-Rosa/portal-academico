package pe.sanagustin.portal.dto;

public record GuardarEstudianteRequest(
        String nombre,
        String apellido,
        String email,
        String grado,
        String seccion,
        String fechaNacimiento,
        String dni
) {}
