package pe.sanagustin.portal.dto;

/**
 * Resumen del alumno para el panel lateral en mensajes.
 */
public record AlumnoContextoDto(
        long   idAlumno,
        String nombre,
        String apellido,
        String grado,
        String seccion,
        String curso,
        String nombrePadre,
        String emailPadre,
        int    totalClases,
        int    clasesPresente,
        int    tareasPendientes,
        double promedio
) {}
