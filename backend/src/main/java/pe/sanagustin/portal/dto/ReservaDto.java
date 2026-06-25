package pe.sanagustin.portal.dto;

/**
 * DTO que representa una reserva de espacio (laboratorio, auditorio, etc.).
 *
 * @param id          Identificador de la reserva
 * @param idMaestro   Identificador del maestro que reserva
 * @param espacio     Nombre del espacio reservado
 * @param fecha       Fecha en formato "YYYY-MM-DD"
 * @param horaInicio  Hora de inicio en "HH:mm"
 * @param horaFin     Hora de fin en "HH:mm"
 * @param idAulaCurso Aula-curso asociada (opcional)
 * @param curso       Nombre del curso asociado (opcional)
 * @param grado       Grado del curso asociado (opcional)
 * @param seccion     Sección del curso asociado (opcional)
 * @param proposito   Propósito de la reserva
 * @param fechaCreacion Fecha de creación en formato "DD/MM/YYYY HH:mm"
 */
public record ReservaDto(
        Long    id,
        Long    idMaestro,
        String  espacio,
        String  fecha,
        String  horaInicio,
        String  horaFin,
        Long    idAulaCurso,
        String  curso,
        String  grado,
        String  seccion,
        String  proposito,
        String  fechaCreacion
) {}
