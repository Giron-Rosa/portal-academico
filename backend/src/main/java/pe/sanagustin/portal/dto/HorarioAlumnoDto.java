package pe.sanagustin.portal.dto;

/**
 * DTO que representa un bloque de clase en el horario semanal del alumno.
 *
 * @param dia        Número de día: 1=Lunes … 5=Viernes
 * @param diaNombre  Nombre legible del día ("Lunes", "Martes"…)
 * @param horaInicio Hora de inicio en formato "HH:mm" (ej. "07:30")
 * @param horaFin    Hora de fin en formato "HH:mm" (ej. "09:00")
 * @param curso      Nombre del curso (ej. "Matemática")
 * @param docente    Nombre del docente (ej. "Oscar Castillo")
 * @param idAulaCurso ID de asignación del curso-aula
 */
public record HorarioAlumnoDto(
        int    dia,
        String diaNombre,
        String horaInicio,
        String horaFin,
        String curso,
        String docente,
        Long   idAulaCurso
) {}
