package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import pe.sanagustin.portal.dto.DisponibilidadResponse;
import pe.sanagustin.portal.dto.NuevaReservaRequest;
import pe.sanagustin.portal.dto.ReservaDto;
import pe.sanagustin.portal.entity.EspacioReserva;
import pe.sanagustin.portal.repository.EspacioReservaRepository;

import java.sql.Date;
import java.sql.Time;
import java.sql.Timestamp;
import java.text.SimpleDateFormat;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ReservaService {

    private final EntityManager em;
    private final EspacioReservaRepository espacioReservaRepository;

    @Transactional(readOnly = true)
    public List<ReservaDto> getReservas(String codigoDocente) {
        String sql = """
                SELECT r.id_reserva,
                       r.id_maestro,
                       r.espacio,
                       TO_CHAR(r.fecha, 'YYYY-MM-DD')        AS fecha,
                       TO_CHAR(r.hora_inicio, 'HH24:MI')     AS hora_inicio,
                       TO_CHAR(r.hora_fin, 'HH24:MI')        AS hora_fin,
                       r.id_aula_curso,
                       c.nombre                              AS curso,
                       g.nombre || ' ' || g.nivel            AS grado,
                       s.nombre                              AS seccion,
                       r.proposito,
                       TO_CHAR(r.fecha_creacion, 'DD/MM/YYYY HH24:MI') AS fecha_creacion
                FROM reservas_espacio r
                JOIN maestros          m  ON m.id_maestro   = r.id_maestro
                JOIN usuarios          u  ON u.id_usuario   = m.id_usuario
                LEFT JOIN aula_cursos  ac ON ac.id_aula_curso = r.id_aula_curso
                LEFT JOIN aulas        a  ON a.id_aula      = ac.id_aula
                LEFT JOIN cursos       c  ON c.id_curso     = ac.id_curso
                LEFT JOIN grados       g  ON g.id_grado     = a.id_grado
                LEFT JOIN secciones    s  ON s.id_seccion   = a.id_seccion
                WHERE u.codigo = :codigo
                ORDER BY r.fecha, r.hora_inicio
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("codigo", codigoDocente)
                .getResultList();

        return rows.stream().map(r -> new ReservaDto(
                ((Number) r[0]).longValue(),
                ((Number) r[1]).longValue(),
                (String) r[2],
                (String) r[3],
                (String) r[4],
                (String) r[5],
                r[6] != null ? ((Number) r[6]).longValue() : null,
                (String) r[7],
                (String) r[8],
                (String) r[9],
                (String) r[10],
                (String) r[11]
        )).toList();
    }

    @Transactional(readOnly = true)
    public List<EspacioReserva> getEspaciosDisponibles(String codigoDocente) {
        String sql = """
                SELECT DISTINCT c.area
                FROM docente_asignaciones da
                JOIN aula_cursos ac ON ac.id_aula_curso = da.id_aula_curso
                JOIN cursos c ON c.id_curso = ac.id_curso
                JOIN maestros mae ON mae.id_maestro = da.id_maestro
                JOIN usuarios u ON u.id_usuario = mae.id_usuario
                WHERE u.codigo = :codigo AND da.activo = true
                """;
        @SuppressWarnings("unchecked")
        List<String> areas = em.createNativeQuery(sql)
                .setParameter("codigo", codigoDocente)
                .getResultList();

        if (areas.isEmpty()) {
            return espacioReservaRepository.findByAreasOrGeneral(List.of());
        }
        return espacioReservaRepository.findByAreasOrGeneral(areas);
    }

    private void validarReserva(Long idReserva, String codigoDocente, NuevaReservaRequest req) {
        String[] startParts = req.horaInicio().split(":");
        String[] endParts = req.horaFin().split(":");
        int startMin = Integer.parseInt(startParts[0]) * 60 + Integer.parseInt(startParts[1]);
        int endMin = Integer.parseInt(endParts[0]) * 60 + Integer.parseInt(endParts[1]);
        int durationMin = endMin - startMin;
        
        if (durationMin <= 0) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La hora de fin debe ser posterior a la hora de inicio.");
        }

        EspacioReserva espacio = espacioReservaRepository.findByNombre(req.espacio())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "El espacio seleccionado no existe."));
        
        if (durationMin > espacio.getLimiteMinutos()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, 
                    "El tiempo solicitado (" + durationMin + " minutos) excede el límite permitido para este espacio (" + espacio.getLimiteMinutos() + " minutos).");
        }

        if (hayConflictoConHorario(codigoDocente, req)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, 
                    "No puedes reservar en este horario porque tienes clase programada con otro grado/sección.");
        }

        if (hayConflicto(idReserva, req.espacio(), req.fecha(), req.horaInicio(), req.horaFin())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, 
                    "El espacio ya se encuentra reservado en ese horario por otro docente.");
        }
    }

    @Transactional(readOnly = true)
    public DisponibilidadResponse verificarDisponibilidad(String codigoDocente, NuevaReservaRequest req) {
        try {
            validarReserva(null, codigoDocente, req);
            return new DisponibilidadResponse(true, "Espacio disponible para la fecha seleccionada.");
        } catch (ResponseStatusException e) {
            return new DisponibilidadResponse(false, e.getReason());
        } catch (Exception e) {
            return new DisponibilidadResponse(false, "Error de validación al comprobar disponibilidad.");
        }
    }

    @Transactional
    public ReservaDto crearReserva(String codigoDocente, NuevaReservaRequest req) {
        validarReserva(null, codigoDocente, req);

        String idMaestroSql = """
                SELECT m.id_maestro
                FROM maestros m
                JOIN usuarios u ON u.id_usuario = m.id_usuario
                WHERE u.codigo = :codigo
                """;
        Number idMaestro = (Number) em.createNativeQuery(idMaestroSql)
                .setParameter("codigo", codigoDocente)
                .getSingleResult();

        String insert = """
                INSERT INTO reservas_espacio
                (id_maestro, espacio, fecha, hora_inicio, hora_fin, id_aula_curso, proposito)
                VALUES (:idMaestro, :espacio, :fecha, :horaInicio, :horaFin, :idAulaCurso, :proposito)
                RETURNING id_reserva
                """;

        @SuppressWarnings("unchecked")
        Number idReserva = (Number) em.createNativeQuery(insert)
                .setParameter("idMaestro", idMaestro)
                .setParameter("espacio", req.espacio())
                .setParameter("fecha", Date.valueOf(req.fecha()))
                .setParameter("horaInicio", Time.valueOf(req.horaInicio() + ":00"))
                .setParameter("horaFin", Time.valueOf(req.horaFin() + ":00"))
                .setParameter("idAulaCurso", req.idAulaCurso())
                .setParameter("proposito", req.proposito())
                .getSingleResult();

        return getReservaById(idReserva.longValue());
    }

    @Transactional
    public ReservaDto actualizarReserva(long idReserva, String codigoDocente, NuevaReservaRequest req) {
        validarReserva(idReserva, codigoDocente, req);

        String sql = """
                UPDATE reservas_espacio r
                SET espacio       = :espacio,
                    fecha         = :fecha,
                    hora_inicio   = :horaInicio,
                    hora_fin      = :horaFin,
                    id_aula_curso = :idAulaCurso,
                    proposito     = :proposito
                WHERE r.id_reserva = :id
                  AND r.id_maestro = (
                      SELECT m.id_maestro
                      FROM maestros m
                      JOIN usuarios u ON u.id_usuario = m.id_usuario
                      WHERE u.codigo = :codigo
                  )
                """;
        int updated = em.createNativeQuery(sql)
                .setParameter("espacio", req.espacio())
                .setParameter("fecha", Date.valueOf(req.fecha()))
                .setParameter("horaInicio", Time.valueOf(req.horaInicio() + ":00"))
                .setParameter("horaFin", Time.valueOf(req.horaFin() + ":00"))
                .setParameter("idAulaCurso", req.idAulaCurso())
                .setParameter("proposito", req.proposito())
                .setParameter("id", idReserva)
                .setParameter("codigo", codigoDocente)
                .executeUpdate();

        if (updated == 0) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No se encontró la reserva o no tienes permiso para editarla.");
        }

        return getReservaById(idReserva);
    }

    @Transactional
    public void eliminarReserva(long idReserva, String codigoDocente) {
        String sql = """
                DELETE FROM reservas_espacio r
                WHERE r.id_reserva = :id
                  AND r.id_maestro = (
                      SELECT m.id_maestro
                      FROM maestros m
                      JOIN usuarios u ON u.id_usuario = m.id_usuario
                      WHERE u.codigo = :codigo
                  )
                """;
        em.createNativeQuery(sql)
                .setParameter("id", idReserva)
                .setParameter("codigo", codigoDocente)
                .executeUpdate();
    }

    private boolean hayConflicto(Long excludeId, String espacio, String fecha, String horaInicio, String horaFin) {
        String sql = """
                SELECT COUNT(*) FROM reservas_espacio r
                WHERE r.espacio = :espacio
                  AND r.fecha = :fecha
                  AND r.id_reserva <> COALESCE(:excludeId, -1)
                  AND (r.hora_inicio < :horaFin AND r.hora_fin > :horaInicio)
                """;
        Number count = (Number) em.createNativeQuery(sql)
                .setParameter("espacio", espacio)
                .setParameter("fecha", Date.valueOf(fecha))
                .setParameter("excludeId", excludeId)
                .setParameter("horaFin", Time.valueOf(horaFin + ":00"))
                .setParameter("horaInicio", Time.valueOf(horaInicio + ":00"))
                .getSingleResult();
        return count.intValue() > 0;
    }

    /**
     * Verifica que la reserva no choque con una clase preprogramada del docente.
     * Si el docente tiene clase en ese horario, la reserva solo se permite cuando
     * el id_aula_curso de la reserva coincide con la clase asignada en ese slot.
     */
    private boolean hayConflictoConHorario(String codigoDocente, NuevaReservaRequest req) {
        int diaSemana = LocalDate.parse(req.fecha()).getDayOfWeek().getValue();
        if (diaSemana > 5) {
            return false; // fines de semana no tienen horario escolar
        }

        String sql = """
                SELECT h.id_aula_curso
                FROM horarios h
                JOIN aula_cursos          ac  ON ac.id_aula_curso = h.id_aula_curso
                JOIN docente_asignaciones da  ON da.id_aula_curso = ac.id_aula_curso AND da.activo = true
                JOIN maestros             mae ON mae.id_maestro   = da.id_maestro
                JOIN usuarios             u   ON u.id_usuario     = mae.id_usuario
                WHERE u.codigo = :codigo
                  AND h.dia_semana = :dia
                  AND (h.hora_inicio < :horaFin AND h.hora_fin > :horaInicio)
                """;
        @SuppressWarnings("unchecked")
        List<Number> idsClase = em.createNativeQuery(sql)
                .setParameter("codigo", codigoDocente)
                .setParameter("dia", diaSemana)
                .setParameter("horaFin", Time.valueOf(req.horaFin() + ":00"))
                .setParameter("horaInicio", Time.valueOf(req.horaInicio() + ":00"))
                .getResultList();

        if (idsClase.isEmpty()) {
            return false; // sin clase en ese horario
        }

        Long idAulaCursoReq = req.idAulaCurso();
        if (idAulaCursoReq == null) {
            return true; // tiene clase pero no se eligió la misma en la reserva
        }

        return idsClase.stream().noneMatch(id -> id.longValue() == idAulaCursoReq);
    }

    private ReservaDto getReservaById(long idReserva) {
        String sql = """
                SELECT r.id_reserva,
                       r.id_maestro,
                       r.espacio,
                       TO_CHAR(r.fecha, 'YYYY-MM-DD')        AS fecha,
                       TO_CHAR(r.hora_inicio, 'HH24:MI')     AS hora_inicio,
                       TO_CHAR(r.hora_fin, 'HH24:MI')        AS hora_fin,
                       r.id_aula_curso,
                       c.nombre                              AS curso,
                       g.nombre || ' ' || g.nivel            AS grado,
                       s.nombre                              AS seccion,
                       r.proposito,
                       TO_CHAR(r.fecha_creacion, 'DD/MM/YYYY HH24:MI') AS fecha_creacion
                FROM reservas_espacio r
                LEFT JOIN aula_cursos  ac ON ac.id_aula_curso = r.id_aula_curso
                LEFT JOIN aulas        a  ON a.id_aula      = ac.id_aula
                LEFT JOIN cursos       c  ON c.id_curso     = ac.id_curso
                LEFT JOIN grados       g  ON g.id_grado     = a.id_grado
                LEFT JOIN secciones    s  ON s.id_seccion   = a.id_seccion
                WHERE r.id_reserva = :id
                """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("id", idReserva)
                .getResultList();
        if (rows.isEmpty()) return null;
        Object[] r = rows.get(0);
        return new ReservaDto(
                ((Number) r[0]).longValue(),
                ((Number) r[1]).longValue(),
                (String) r[2],
                (String) r[3],
                (String) r[4],
                (String) r[5],
                r[6] != null ? ((Number) r[6]).longValue() : null,
                (String) r[7],
                (String) r[8],
                (String) r[9],
                (String) r[10],
                (String) r[11]
        );
    }
}
