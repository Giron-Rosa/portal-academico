package pe.sanagustin.portal.dto;

/**
 * Alumno que el docente puede contactar (para el modal "Nuevo chat").
 * Incluye datos del padre vinculado para mostrar a quién se enviará el mensaje.
 */
public record AlumnoDisponibleDto(
        long   idAlumno,
        String nombreAlumno,
        String grado,
        String seccion,
        long   idPadre,
        String nombrePadre,
        String emailPadre,
        long   idAulaCurso,
        String curso
) {}
