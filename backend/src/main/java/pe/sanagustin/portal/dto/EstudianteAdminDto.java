package pe.sanagustin.portal.dto;

public record EstudianteAdminDto(
        Long idAlumno,
        String codigo,
        String nombre,
        String apellido,
        String grado,
        String seccion,
        String email,
        String estado
) {}
