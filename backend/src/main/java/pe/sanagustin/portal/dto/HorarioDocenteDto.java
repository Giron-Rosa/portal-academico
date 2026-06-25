package pe.sanagustin.portal.dto;

/**
 * DTO que representa un bloque de clase en el horario semanal del docente.
 * Cada instancia corresponde a una fila de la tabla `horarios` enriquecida
 * con los datos del curso, grado y sección.
 *
 * @param dia        Número de día: 1=Lunes … 5=Viernes
 * @param diaNombre  Nombre legible del día ("Lunes", "Martes"…)
 * @param horaInicio Hora de inicio en formato "HH:mm"  (ej. "07:30")
 * @param horaFin    Hora de fin    en formato "HH:mm"  (ej. "09:00")
 * @param curso      Nombre del curso        (ej. "Matemática")
 * @param grado      Nombre del grado        (ej. "5to Secundaria")
 * @param seccion    Letra de sección        (ej. "B")
 */
public record HorarioDocenteDto(
        int    dia,
        String diaNombre,
        String horaInicio,
        String horaFin,
        String curso,
        String grado,
        String seccion,
        Long   idAulaCurso
) {}
