package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import pe.sanagustin.portal.dto.AlumnoContextoDto;
import pe.sanagustin.portal.dto.AlumnoDisponibleDto;
import pe.sanagustin.portal.dto.MensajeDetalleDto;
import pe.sanagustin.portal.dto.MensajeResumenDto;
import pe.sanagustin.portal.dto.NotificacionWsDto;
import pe.sanagustin.portal.dto.NuevoChatRequest;
import pe.sanagustin.portal.dto.RespuestaResumenDto;

import pe.sanagustin.portal.dto.DocenteDisponibleDto;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MensajeService {

    private final EntityManager em;
    private final SimpMessagingTemplate ws;

    /* ─────────────────────────────────────────────────────────
       SQL reutilizable: columnas comunes para resumen y detalle
    ───────────────────────────────────────────────────────── */
    private static final String COLS_COMUNES = """
            m.id_mensaje,
            m.asunto,
            m.tipo,
            m.leido,
            TO_CHAR(m.fecha_envio, 'DD/MM/YYYY HH24:MI') AS fecha_envio,
            p.nombre  || ' ' || p.apellido  AS nombre_padre,
            al.nombre || ' ' || al.apellido AS nombre_alumno,
            m.id_alumno,
            g.nombre  AS grado,
            s.nombre  AS seccion,
            c.nombre  AS curso,
            (SELECT COUNT(*) FROM mensajes_respuestas mr WHERE mr.id_mensaje = m.id_mensaje) AS cant_respuestas,
            SUBSTRING(m.cuerpo FROM 1 FOR 60)            AS ultima_respuesta,
            m.iniciado_por_maestro
            """;

    private static final String JOINS_COMUNES = """
            JOIN   padres          p   ON p.id_padre      = m.id_padre
            JOIN   maestros        mae ON mae.id_maestro   = m.id_maestro
            JOIN   usuarios        u   ON u.id_usuario     = mae.id_usuario
            LEFT JOIN alumnos      al  ON al.id_alumno     = m.id_alumno
            LEFT JOIN aula_cursos  ac  ON ac.id_aula_curso = m.id_aula_curso
            LEFT JOIN cursos       c   ON c.id_curso       = ac.id_curso
            LEFT JOIN aulas        a   ON a.id_aula        = ac.id_aula
            LEFT JOIN grados       g   ON g.id_grado       = a.id_grado
            LEFT JOIN secciones    s   ON s.id_seccion     = a.id_seccion
            """;

    /* ─────────────────────────────────────────────────────────
       getMensajes: lista de mensajes para el docente autenticado.
       Se devuelven ordenados: primero los no leídos, luego los
       más recientes. El docente puede filtrar por grado en el
       frontend (no se filtra en el SQL para evitar múltiples
       llamadas).
    ───────────────────────────────────────────────────────── */
    public List<MensajeResumenDto> getMensajes(String codigoDocente) {

        String sql = "SELECT * FROM (SELECT DISTINCT ON (m.id_mensaje) " + COLS_COMUNES +
                "FROM mensajes m " + JOINS_COMUNES +
                "WHERE u.codigo = :codigo " +
                "ORDER BY m.id_mensaje) sub " +
                "ORDER BY sub.leido ASC, sub.fecha_envio DESC";

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("codigo", codigoDocente)
                .getResultList();

        return rows.stream().map(r -> new MensajeResumenDto(
                ((Number)  r[0]).longValue(),                       // id
                (String)   r[1],                                    // asunto
                (String)   r[2],                                    // tipo
                (Boolean)  r[3],                                    // leido
                (String)   r[4],                                    // fechaEnvio
                (String)   r[5],                                    // nombrePadre
                (String)   r[6],                                    // nombreAlumno (nullable)
                r[7] != null ? ((Number) r[7]).longValue() : null,  // idAlumno (nullable)
                (String)   r[8],                                    // grado (nullable)
                (String)   r[9],                                    // seccion (nullable)
                (String)   r[10],                                   // curso (nullable)
                ((Number)  r[11]).intValue(),                       // cantRespuestas
                (String)   r[12]                                    // ultimaRespuesta
        )).toList();
    }

    /* ─────────────────────────────────────────────────────────
       getDetalle: mensaje completo + hilo de respuestas.
       Al abrirlo, se marca como leído automáticamente.
       Lanza 404 si el mensaje no pertenece al docente.
    ───────────────────────────────────────────────────────── */
    @Transactional
    public MensajeDetalleDto getDetalle(long idMensaje, String codigoDocente) {

        /* Obtener el mensaje principal con validación de pertenencia */
        String sqlMsg = "SELECT " + COLS_COMUNES + ", m.cuerpo " +
                "FROM mensajes m " + JOINS_COMUNES +
                "WHERE m.id_mensaje = :id AND u.codigo = :codigo";

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sqlMsg)
                .setParameter("id",     idMensaje)
                .setParameter("codigo", codigoDocente)
                .getResultList();

        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Mensaje no encontrado");
        }

        Object[] r = rows.get(0);

        /* Marcar como leído si aún no lo estaba */
        em.createNativeQuery(
                "UPDATE mensajes SET leido = TRUE WHERE id_mensaje = :id")
                .setParameter("id", idMensaje)
                .executeUpdate();

        /* Obtener el hilo de respuestas del mensaje */
        List<RespuestaResumenDto> respuestas = getRespuestas(idMensaje);

        return new MensajeDetalleDto(
                ((Number)  r[0]).longValue(),                       // id
                (String)   r[1],                                    // asunto
                (String)   r[2],                                    // tipo
                (Boolean)  r[3],                                    // leido
                (String)   r[4],                                    // fechaEnvio
                (String)   r[5],                                    // nombrePadre
                (String)   r[6],                                    // nombreAlumno
                r[7] != null ? ((Number) r[7]).longValue() : null,  // idAlumno
                (String)   r[8],                                    // grado
                (String)   r[9],                                    // seccion
                (String)   r[10],                                   // curso
                (String)   r[14],                                   // cuerpo (idx 14: after cols 0-12 + iniciado_por_maestro=13)
                respuestas,
                (Boolean)  r[13]                                    // iniciadoPorDocente
        );
    }

    /* ─────────────────────────────────────────────────────────
       responder: el docente agrega una respuesta al hilo.
       Se inserta en mensajes_respuestas usando el id_usuario
       del docente autenticado.
    ───────────────────────────────────────────────────────── */
    @Transactional
    public void responder(long idMensaje, String cuerpo, String codigoDocente) {

        /* Verificar que el mensaje pertenece a este docente */
        @SuppressWarnings("unchecked")
        List<?> check = em.createNativeQuery("""
                SELECT 1 FROM mensajes m
                JOIN maestros mae ON mae.id_maestro = m.id_maestro
                JOIN usuarios u   ON u.id_usuario   = mae.id_usuario
                WHERE m.id_mensaje = :id AND u.codigo = :codigo
                """)
                .setParameter("id",     idMensaje)
                .setParameter("codigo", codigoDocente)
                .getResultList();

        if (check.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }

        /* Insertar la respuesta */
        @SuppressWarnings("unchecked")
        List<Object> respIdRows = em.createNativeQuery("""
                INSERT INTO mensajes_respuestas (id_mensaje, id_usuario, cuerpo)
                VALUES (:idMsg,
                        (SELECT id_usuario FROM usuarios WHERE codigo = :codigo),
                        :cuerpo)
                RETURNING id_respuesta
                """)
                .setParameter("idMsg",   idMensaje)
                .setParameter("codigo",  codigoDocente)
                .setParameter("cuerpo",  cuerpo)
                .getResultList();

        long idRespuesta = ((Number) respIdRows.get(0)).longValue();

        /* Actualizar leido_padre = FALSE para el padre */
        em.createNativeQuery("UPDATE mensajes SET leido_padre = FALSE WHERE id_mensaje = :id")
                .setParameter("id", idMensaje)
                .executeUpdate();

        /* Consultar detalles para la habitación del chat */
        Object[] respRow = (Object[]) em.createNativeQuery("""
                SELECT mr.id_respuesta,
                       mr.cuerpo,
                       TO_CHAR(mr.fecha, 'DD/MM/YYYY HH24:MI') AS fecha,
                       COALESCE(mae.nombre || ' ' || mae.apellido,
                                pa.nombre  || ' ' || pa.apellido)  AS autor,
                       (mae.id_maestro IS NOT NULL)                AS es_maestro
                FROM mensajes_respuestas mr
                JOIN usuarios u   ON u.id_usuario   = mr.id_usuario
                LEFT JOIN maestros mae ON mae.id_usuario = u.id_usuario
                LEFT JOIN padres   pa  ON pa.id_usuario  = u.id_usuario
                WHERE mr.id_respuesta = :id
                """)
                .setParameter("id", idRespuesta)
                .getSingleResult();

        RespuestaResumenDto respDto = new RespuestaResumenDto(
                ((Number) respRow[0]).longValue(),
                (String)  respRow[1],
                (String)  respRow[2],
                (String)  respRow[3],
                (Boolean) respRow[4]
        );

        /* Emitir a la habitación del chat */
        ws.convertAndSend("/topic/chat/" + idMensaje, respDto);

        /* ── Broadcast WebSocket a ambos lados del hilo ─────────────────
           /topic/mensajes/{codigoPadre}   → para que el padre vea el badge
           /topic/mensajes/{codigoDocente} → para refrescar vista del propio docente
        ────────────────────────────────────────────────────────────────── */
        Object[] msgInfo = (Object[]) em.createNativeQuery("""
                SELECT m.asunto,
                       mae.nombre || ' ' || mae.apellido AS nombre_mae,
                       u_p.codigo AS codigo_padre
                FROM mensajes m
                JOIN maestros mae ON mae.id_maestro = m.id_maestro
                JOIN padres   pa  ON pa.id_padre    = m.id_padre
                JOIN usuarios u_p ON u_p.id_usuario = pa.id_usuario
                WHERE m.id_mensaje = :id
                """)
                .setParameter("id", idMensaje)
                .getSingleResult();

        String asunto       = (String) msgInfo[0];
        String nombreDocente = (String) msgInfo[1];
        String codigoPadre  = (String) msgInfo[2];
        String prevCuerpo   = cuerpo.length() > 80 ? cuerpo.substring(0, 80) + "…" : cuerpo;

        NotificacionWsDto notifPadre = new NotificacionWsDto(
                "NUEVA_RESPUESTA", idMensaje, asunto, nombreDocente, prevCuerpo, codigoPadre);
        NotificacionWsDto notifDocente = new NotificacionWsDto(
                "NUEVA_RESPUESTA", idMensaje, asunto, nombreDocente, prevCuerpo, codigoDocente);

        ws.convertAndSend("/topic/mensajes/" + codigoPadre,  notifPadre);
        ws.convertAndSend("/topic/mensajes/" + codigoDocente, notifDocente);
    }

    /* ─────────────────────────────────────────────────────────
       getContextoAlumno: resumen del alumno para el panel lateral.
       Devuelve asistencia (%), tareas pendientes y promedio de notas.
    ───────────────────────────────────────────────────────── */
    public AlumnoContextoDto getContextoAlumno(long idAlumno, String codigoDocente) {

        /* Obtener el id_aula_curso del mensaje más reciente del alumno
           para este docente — así sabemos exactamente qué curso/aula usar.
           Single-column query → JPA devuelve List<Object>, no List<Object[]> */
        @SuppressWarnings("unchecked")
        List<Object> acRows = em.createNativeQuery("""
                SELECT m.id_aula_curso
                FROM mensajes m
                JOIN maestros mae ON mae.id_maestro = m.id_maestro
                JOIN usuarios u   ON u.id_usuario   = mae.id_usuario
                WHERE m.id_alumno = :idAlumno AND u.codigo = :codigo
                ORDER BY m.fecha_envio DESC LIMIT 1
                """)
                .setParameter("idAlumno", idAlumno)
                .setParameter("codigo",   codigoDocente)
                .getResultList();

        Long idAulaCurso = acRows.isEmpty() ? null
                : ((Number) acRows.get(0)).longValue();

        String sql = """
                SELECT al.id_alumno,
                       al.nombre,
                       al.apellido,
                       COALESCE(g.nombre, al.grado)                  AS grado,
                       COALESCE(s.nombre, al.seccion)                AS seccion,
                       COALESCE(c.nombre, '–')                       AS curso,
                       COALESCE(pa.nombre || ' ' || pa.apellido, '–') AS nombre_padre,
                       COALESCE(u_pa.email, '–')                     AS email_padre,
                       COUNT(aa.id_asistencia)                       AS total_clases,
                       COUNT(aa.id_asistencia) FILTER (
                           WHERE aa.estado IN ('presente','tardanza','justificado')
                       )                                             AS clases_presente,
                       COALESCE((SELECT COUNT(*) FROM notas_tarea nt
                        JOIN tareas_curso t ON t.id_tarea = nt.id_tarea
                        WHERE nt.id_alumno = al.id_alumno
                          AND nt.entregado = FALSE
                          AND t.id_aula_curso = :idAulaCurso), 0)    AS tareas_pendientes,
                       COALESCE(
                           (SELECT ROUND(AVG(nt.nota)::numeric, 1)
                            FROM notas_tarea nt
                            WHERE nt.id_alumno = al.id_alumno
                              AND nt.nota IS NOT NULL), 0
                       )                                             AS promedio
                FROM alumnos al
                LEFT JOIN padre_hijo ph  ON ph.id_alumno    = al.id_alumno AND ph.es_principal = TRUE
                LEFT JOIN padres    pa   ON pa.id_padre     = ph.id_padre
                LEFT JOIN usuarios  u_pa ON u_pa.id_usuario = pa.id_usuario
                LEFT JOIN aula_cursos ac ON ac.id_aula_curso = :idAulaCurso
                LEFT JOIN cursos    c    ON c.id_curso       = ac.id_curso
                LEFT JOIN aulas     a    ON a.id_aula        = ac.id_aula
                LEFT JOIN grados    g    ON g.id_grado       = a.id_grado
                LEFT JOIN secciones s    ON s.id_seccion     = a.id_seccion
                LEFT JOIN asistencia_alumno aa ON aa.id_alumno = al.id_alumno
                                              AND aa.id_aula_curso = :idAulaCurso
                WHERE al.id_alumno = :idAlumno
                GROUP BY al.id_alumno, al.nombre, al.apellido, al.grado, al.seccion,
                         g.nombre, s.nombre, c.nombre,
                         pa.nombre, pa.apellido, u_pa.email
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("idAlumno",    idAlumno)
                .setParameter("idAulaCurso", idAulaCurso != null ? idAulaCurso : 0L)
                .getResultList();

        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Alumno no encontrado");
        }

        Object[] r = rows.get(0);
        return new AlumnoContextoDto(
                ((Number) r[0]).longValue(),
                (String)  r[1],
                (String)  r[2],
                (String)  r[3],
                (String)  r[4],
                (String)  r[5],
                r[6] != null ? (String) r[6] : "–",
                r[7] != null ? (String) r[7] : "–",
                ((Number) r[8]).intValue(),
                ((Number) r[9]).intValue(),
                ((Number) r[10]).intValue(),
                ((Number) r[11]).doubleValue()
        );
    }

    /* ─────────────────────────────────────────────────────────
       getAlumnosDisponibles: lista de alumnos que el docente
       puede contactar (tienen padre vinculado y están en una
       de sus aulas asignadas).
    ───────────────────────────────────────────────────────── */
    public List<AlumnoDisponibleDto> getAlumnosDisponibles(String codigoDocente) {

        String sql = """
                SELECT DISTINCT ON (al.id_alumno, pa.id_padre)
                       al.id_alumno,
                       al.nombre || ' ' || al.apellido     AS nombre_alumno,
                       g.nombre                            AS grado,
                       s.nombre                            AS seccion,
                       pa.id_padre,
                       pa.nombre || ' ' || pa.apellido     AS nombre_padre,
                       u_pa.email                          AS email_padre,
                       ac.id_aula_curso,
                       c.nombre                            AS curso
                FROM alumnos al
                JOIN matriculas mat    ON mat.id_alumno    = al.id_alumno AND mat.estado = 'activa'
                JOIN aulas a           ON a.id_aula        = mat.id_aula
                JOIN grados g          ON g.id_grado       = a.id_grado
                JOIN secciones s       ON s.id_seccion     = a.id_seccion
                JOIN aula_cursos ac    ON ac.id_aula       = a.id_aula
                JOIN cursos c          ON c.id_curso       = ac.id_curso
                JOIN docente_asignaciones da ON da.id_aula_curso = ac.id_aula_curso
                JOIN maestros mae       ON mae.id_maestro  = da.id_maestro
                JOIN usuarios u         ON u.id_usuario    = mae.id_usuario
                JOIN padre_hijo ph      ON ph.id_alumno    = al.id_alumno AND ph.es_principal = TRUE
                JOIN padres pa          ON pa.id_padre     = ph.id_padre
                JOIN usuarios u_pa      ON u_pa.id_usuario = pa.id_usuario
                WHERE u.codigo = :codigo
                ORDER BY al.id_alumno, pa.id_padre, ac.id_aula_curso
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("codigo", codigoDocente)
                .getResultList();

        return rows.stream().map(r -> new AlumnoDisponibleDto(
                ((Number) r[0]).longValue(),
                (String)  r[1],
                (String)  r[2],
                (String)  r[3],
                ((Number) r[4]).longValue(),
                (String)  r[5],
                (String)  r[6],
                ((Number) r[7]).longValue(),
                (String)  r[8]
        )).toList();
    }

    /* ─────────────────────────────────────────────────────────
       iniciarChat: el docente crea un nuevo hilo de mensajes
       dirigido al padre del alumno seleccionado.
       Devuelve el id del mensaje creado.
    ───────────────────────────────────────────────────────── */
    @Transactional
    public long iniciarChat(NuevoChatRequest req, String codigoDocente) {

        /* Obtener id_maestro del docente autenticado */
        @SuppressWarnings("unchecked")
        List<Object> maeRows = em.createNativeQuery(
                "SELECT mae.id_maestro FROM maestros mae JOIN usuarios u ON u.id_usuario=mae.id_usuario WHERE u.codigo=:codigo")
                .setParameter("codigo", codigoDocente)
                .getResultList();

        if (maeRows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Docente no encontrado");
        }
        long idMaestro = ((Number) maeRows.get(0)).longValue();

        /* Insertar el mensaje y retornar su id */
        @SuppressWarnings("unchecked")
        List<Object> idRows = em.createNativeQuery("""
                INSERT INTO mensajes (id_padre, id_maestro, id_alumno, id_aula_curso,
                                      asunto, cuerpo, tipo, leido, iniciado_por_maestro, fecha_envio)
                VALUES (:idPadre, :idMaestro, :idAlumno, :idAulaCurso,
                        :asunto, :cuerpo, 'consulta', TRUE, TRUE, NOW())
                RETURNING id_mensaje
                """)
                .setParameter("idPadre",    req.getIdPadre())
                .setParameter("idMaestro",  idMaestro)
                .setParameter("idAlumno",   req.getIdAlumno())
                .setParameter("idAulaCurso",req.getIdAulaCurso())
                .setParameter("asunto",     req.getAsunto())
                .setParameter("cuerpo",     req.getCuerpo())
                .getResultList();

        long idMensajeNuevo = ((Number) idRows.get(0)).longValue();

        /* ── Broadcast WebSocket: notificar al padre que recibió un nuevo mensaje ── */
        String codigoPadre = (String) em.createNativeQuery(
                "SELECT u.codigo FROM padres pa JOIN usuarios u ON u.id_usuario=pa.id_usuario WHERE pa.id_padre=:idPadre")
                .setParameter("idPadre", req.getIdPadre())
                .getSingleResult();

        String prevBody = req.getCuerpo().length() > 80
                ? req.getCuerpo().substring(0, 80) + "…" : req.getCuerpo();

        String nombreDocente = (String) em.createNativeQuery(
                "SELECT mae.nombre || ' ' || mae.apellido FROM maestros mae JOIN usuarios u ON u.id_usuario=mae.id_usuario WHERE u.codigo=:codigo")
                .setParameter("codigo", codigoDocente)
                .getSingleResult();

        NotificacionWsDto notifPadre = new NotificacionWsDto(
                "NUEVO_MENSAJE", idMensajeNuevo, req.getAsunto(), nombreDocente, prevBody, codigoPadre);

        ws.convertAndSend("/topic/mensajes/" + codigoPadre, notifPadre);

        return idMensajeNuevo;
    }

    /* ─────────────────────────────────────────────────────────
       Privado: obtiene las respuestas de un hilo ordenadas
       cronológicamente (las más antiguas primero).
    ───────────────────────────────────────────────────────── */
    private List<RespuestaResumenDto> getRespuestas(long idMensaje) {

        String sql = """
                SELECT mr.id_respuesta,
                       mr.cuerpo,
                       TO_CHAR(mr.fecha, 'DD/MM/YYYY HH24:MI') AS fecha,
                       COALESCE(mae.nombre || ' ' || mae.apellido,
                                pa.nombre  || ' ' || pa.apellido)  AS autor,
                       (mae.id_maestro IS NOT NULL)                AS es_maestro
                FROM mensajes_respuestas mr
                JOIN usuarios u   ON u.id_usuario   = mr.id_usuario
                LEFT JOIN maestros mae ON mae.id_usuario = u.id_usuario
                LEFT JOIN padres   pa  ON pa.id_usuario  = u.id_usuario
                WHERE mr.id_mensaje = :id
                ORDER BY mr.fecha ASC
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("id", idMensaje)
                .getResultList();

        return rows.stream().map(r -> new RespuestaResumenDto(
                ((Number) r[0]).longValue(),
                (String)  r[1],
                (String)  r[2],
                (String)  r[3],
                (Boolean) r[4]
        )).toList();
    }

    /* ── MÉTODOS DEL PORTAL DE PADRES ───────────────────────────────── */

    public List<MensajeResumenDto> getMensajesPadre(String codigoPadre) {
        String sql = """
                SELECT * FROM (
                    SELECT DISTINCT ON (m.id_mensaje)
                           m.id_mensaje,
                           m.asunto,
                           m.tipo,
                           m.leido_padre AS leido,
                           TO_CHAR(m.fecha_envio, 'DD/MM/YYYY HH24:MI') AS fecha_envio,
                           mae.nombre || ' ' || mae.apellido AS nombre_maestro,
                           al.nombre  || ' ' || al.apellido  AS nombre_alumno,
                           m.id_alumno,
                           g.nombre   AS grado,
                           s.nombre   AS seccion,
                           c.nombre   AS curso,
                           (SELECT COUNT(*) FROM mensajes_respuestas mr WHERE mr.id_mensaje = m.id_mensaje) AS cant_respuestas,
                           SUBSTRING(m.cuerpo FROM 1 FOR 60) AS ultima_respuesta,
                           m.iniciado_por_maestro
                    FROM mensajes m
                    JOIN padres   p   ON p.id_padre     = m.id_padre
                    JOIN usuarios u_p ON u_p.id_usuario = p.id_usuario
                    JOIN maestros mae ON mae.id_maestro = m.id_maestro
                    LEFT JOIN alumnos al ON al.id_alumno = m.id_alumno
                    LEFT JOIN aula_cursos ac ON ac.id_aula_curso = m.id_aula_curso
                    LEFT JOIN cursos c ON c.id_curso = ac.id_curso
                    LEFT JOIN aulas a ON a.id_aula = ac.id_aula
                    LEFT JOIN grados g ON g.id_grado = a.id_grado
                    LEFT JOIN secciones s ON s.id_seccion = a.id_seccion
                    WHERE u_p.codigo = :codigo
                    ORDER BY m.id_mensaje
                ) sub
                ORDER BY sub.leido ASC, sub.fecha_envio DESC
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("codigo", codigoPadre)
                .getResultList();

        return rows.stream().map(r -> new MensajeResumenDto(
                ((Number)  r[0]).longValue(),
                (String)   r[1],
                (String)   r[2],
                (Boolean)  r[3],
                (String)   r[4],
                (String)   r[5], // nombre del maestro asignado a "nombrePadre"
                (String)   r[6],
                r[7] != null ? ((Number) r[7]).longValue() : null,
                (String)   r[8],
                (String)   r[9],
                (String)   r[10],
                ((Number)  r[11]).intValue(),
                (String)   r[12]
        )).toList();
    }

    @Transactional
    public MensajeDetalleDto getDetallePadre(long idMensaje, String codigoPadre) {
        String sqlMsg = """
                SELECT m.id_mensaje,
                       m.asunto,
                       m.tipo,
                       m.leido_padre AS leido,
                       TO_CHAR(m.fecha_envio, 'DD/MM/YYYY HH24:MI') AS fecha_envio,
                       mae.nombre || ' ' || mae.apellido AS nombre_maestro,
                       al.nombre || ' ' || al.apellido AS nombre_alumno,
                       m.id_alumno,
                       g.nombre AS grado,
                       s.nombre AS seccion,
                       c.nombre AS curso,
                       m.cuerpo,
                       m.iniciado_por_maestro
                FROM mensajes m
                JOIN padres   p   ON p.id_padre     = m.id_padre
                JOIN usuarios u_p ON u_p.id_usuario = p.id_usuario
                JOIN maestros mae ON mae.id_maestro = m.id_maestro
                LEFT JOIN alumnos al ON al.id_alumno = m.id_alumno
                LEFT JOIN aula_cursos ac ON ac.id_aula_curso = m.id_aula_curso
                LEFT JOIN cursos c ON c.id_curso = ac.id_curso
                LEFT JOIN aulas a ON a.id_aula = ac.id_aula
                LEFT JOIN grados g ON g.id_grado = a.id_grado
                LEFT JOIN secciones s ON s.id_seccion = a.id_seccion
                WHERE m.id_mensaje = :id AND u_p.codigo = :codigo
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sqlMsg)
                .setParameter("id",     idMensaje)
                .setParameter("codigo", codigoPadre)
                .getResultList();

        if (rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Mensaje no encontrado");
        }

        Object[] r = rows.get(0);

        /* Marcar como leído por el padre */
        em.createNativeQuery("UPDATE mensajes SET leido_padre = TRUE WHERE id_mensaje = :id")
                .setParameter("id", idMensaje)
                .executeUpdate();

        List<RespuestaResumenDto> respuestas = getRespuestas(idMensaje);

        return new MensajeDetalleDto(
                ((Number)  r[0]).longValue(),
                (String)   r[1],
                (String)   r[2],
                (Boolean)  r[3],
                (String)   r[4],
                (String)   r[5], // nombre docente
                (String)   r[6], // nombre alumno
                r[7] != null ? ((Number) r[7]).longValue() : null,
                (String)   r[8],
                (String)   r[9],
                (String)   r[10],
                (String)   r[11], // cuerpo
                respuestas,
                (Boolean)  r[12]
        );
    }

    public List<RespuestaResumenDto> getRespuestasPaginadas(long idMensaje, int page, int size) {
        int offset = page * size;
        String sql = """
                SELECT mr.id_respuesta,
                       mr.cuerpo,
                       TO_CHAR(mr.fecha, 'DD/MM/YYYY HH24:MI') AS fecha,
                       COALESCE(mae.nombre || ' ' || mae.apellido,
                                pa.nombre  || ' ' || pa.apellido)  AS autor,
                       (mae.id_maestro IS NOT NULL)                AS es_maestro
                FROM mensajes_respuestas mr
                JOIN usuarios u   ON u.id_usuario   = mr.id_usuario
                LEFT JOIN maestros mae ON mae.id_usuario = u.id_usuario
                LEFT JOIN padres   pa  ON pa.id_usuario  = u.id_usuario
                WHERE mr.id_mensaje = :id
                ORDER BY mr.fecha DESC
                LIMIT :limit OFFSET :offset
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("id", idMensaje)
                .setParameter("limit", size)
                .setParameter("offset", offset)
                .getResultList();

        List<RespuestaResumenDto> list = rows.stream().map(r -> new RespuestaResumenDto(
                ((Number) r[0]).longValue(),
                (String)  r[1],
                (String)  r[2],
                (String)  r[3],
                (Boolean) r[4]
        )).toList();

        List<RespuestaResumenDto> reversed = new ArrayList<>(list);
        Collections.reverse(reversed);
        return reversed;
    }

    @Transactional
    public void responderPadre(long idMensaje, String cuerpo, String codigoPadre) {
        /* Verificar que el mensaje pertenece a este padre */
        @SuppressWarnings("unchecked")
        List<?> check = em.createNativeQuery("""
                SELECT 1 FROM mensajes m
                JOIN padres p   ON p.id_padre     = m.id_padre
                JOIN usuarios u ON u.id_usuario   = p.id_usuario
                WHERE m.id_mensaje = :id AND u.codigo = :codigo
                """)
                .setParameter("id",     idMensaje)
                .setParameter("codigo", codigoPadre)
                .getResultList();

        if (check.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }

        /* Insertar la respuesta */
        @SuppressWarnings("unchecked")
        List<Object> respIdRows = em.createNativeQuery("""
                INSERT INTO mensajes_respuestas (id_mensaje, id_usuario, cuerpo)
                VALUES (:idMsg,
                        (SELECT id_usuario FROM usuarios WHERE codigo = :codigo),
                        :cuerpo)
                RETURNING id_respuesta
                """)
                .setParameter("idMsg",   idMensaje)
                .setParameter("codigo",  codigoPadre)
                .setParameter("cuerpo",  cuerpo)
                .getResultList();

        long idRespuesta = ((Number) respIdRows.get(0)).longValue();

        /* Actualizar leido = FALSE para el docente */
        em.createNativeQuery("UPDATE mensajes SET leido = FALSE WHERE id_mensaje = :id")
                .setParameter("id", idMensaje)
                .executeUpdate();

        /* Consultar detalles para la habitación del chat */
        Object[] respRow = (Object[]) em.createNativeQuery("""
                SELECT mr.id_respuesta,
                       mr.cuerpo,
                       TO_CHAR(mr.fecha, 'DD/MM/YYYY HH24:MI') AS fecha,
                       COALESCE(mae.nombre || ' ' || mae.apellido,
                                pa.nombre  || ' ' || pa.apellido)  AS autor,
                       (mae.id_maestro IS NOT NULL)                AS es_maestro
                FROM mensajes_respuestas mr
                JOIN usuarios u   ON u.id_usuario   = mr.id_usuario
                LEFT JOIN maestros mae ON mae.id_usuario = u.id_usuario
                LEFT JOIN padres   pa  ON pa.id_usuario  = u.id_usuario
                WHERE mr.id_respuesta = :id
                """)
                .setParameter("id", idRespuesta)
                .getSingleResult();

        RespuestaResumenDto respDto = new RespuestaResumenDto(
                ((Number) respRow[0]).longValue(),
                (String)  respRow[1],
                (String)  respRow[2],
                (String)  respRow[3],
                (Boolean) respRow[4]
        );

        /* Emitir a la habitación del chat */
        ws.convertAndSend("/topic/chat/" + idMensaje, respDto);

        /* Broadcast de notificación */
        Object[] msgInfo = (Object[]) em.createNativeQuery("""
                SELECT m.asunto,
                       pa.nombre || ' ' || pa.apellido AS nombre_padre,
                       u_m.codigo AS codigo_docente
                FROM mensajes m
                JOIN padres   pa  ON pa.id_padre    = m.id_padre
                JOIN maestros mae ON mae.id_maestro = m.id_maestro
                JOIN usuarios u_m ON u_m.id_usuario = mae.id_usuario
                WHERE m.id_mensaje = :id
                """)
                .setParameter("id", idMensaje)
                .getSingleResult();

        String asunto       = (String) msgInfo[0];
        String nombrePadre  = (String) msgInfo[1];
        String codigoDocente = (String) msgInfo[2];
        String prevCuerpo   = cuerpo.length() > 80 ? cuerpo.substring(0, 80) + "…" : cuerpo;

        NotificacionWsDto notifDocente = new NotificacionWsDto(
                "NUEVA_RESPUESTA", idMensaje, asunto, nombrePadre, prevCuerpo, codigoDocente);
        NotificacionWsDto notifPadre = new NotificacionWsDto(
                "NUEVA_RESPUESTA", idMensaje, asunto, nombrePadre, prevCuerpo, codigoPadre);

        ws.convertAndSend("/topic/mensajes/" + codigoDocente, notifDocente);
        ws.convertAndSend("/topic/mensajes/" + codigoPadre,   notifPadre);
    }

    public List<DocenteDisponibleDto> getDocentesDisponiblesParaPadre(String codigoPadre) {
        String sql = """
                SELECT DISTINCT
                       mae.id_maestro,
                       mae.nombre || ' ' || mae.apellido AS nombre_maestro,
                       c.nombre AS curso,
                       al.nombre || ' ' || al.apellido AS nombre_alumno,
                       al.id_alumno,
                       ac.id_aula_curso
                FROM padre_hijo ph
                JOIN padres   p   ON p.id_padre     = ph.id_padre
                JOIN usuarios u_p ON u_p.id_usuario = p.id_usuario
                JOIN alumnos  al  ON al.id_alumno   = ph.id_alumno
                JOIN matriculas m ON m.id_alumno    = al.id_alumno AND m.estado = 'activa'
                JOIN aula_cursos ac ON ac.id_aula   = m.id_aula
                JOIN cursos   c   ON c.id_curso     = ac.id_curso
                JOIN docente_asignaciones da ON da.id_aula_curso = ac.id_aula_curso AND da.activo = TRUE
                JOIN maestros mae ON mae.id_maestro = da.id_maestro
                WHERE u_p.codigo = :codigo
                ORDER BY nombre_alumno, curso
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("codigo", codigoPadre)
                .getResultList();

        return rows.stream().map(r -> new DocenteDisponibleDto(
                ((Number) r[0]).longValue(),
                (String)  r[1],
                (String)  r[2],
                (String)  r[3],
                ((Number) r[4]).longValue(),
                ((Number) r[5]).longValue()
        )).toList();
    }

    @Transactional
    public long iniciarChatPadre(NuevoChatRequest req, String codigoPadre) {
        /* Obtener id_padre del padre autenticado */
        @SuppressWarnings("unchecked")
        List<Object> padRows = em.createNativeQuery(
                "SELECT p.id_padre FROM padres p JOIN usuarios u ON u.id_usuario=p.id_usuario WHERE u.codigo=:codigo")
                .setParameter("codigo", codigoPadre)
                .getResultList();

        if (padRows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Padre no encontrado");
        }
        long idPadre = ((Number) padRows.get(0)).longValue();

        /* Obtener el id_maestro asignado a este aula_curso */
        @SuppressWarnings("unchecked")
        List<Object> maeRows = em.createNativeQuery(
                "SELECT id_maestro FROM docente_asignaciones WHERE id_aula_curso = :idAulaCurso AND activo = TRUE")
                .setParameter("idAulaCurso", req.getIdAulaCurso())
                .getResultList();

        if (maeRows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No hay docente asignado para este curso");
        }
        long idMaestro = ((Number) maeRows.get(0)).longValue();

        /* Insertar el mensaje y retornar su id */
        @SuppressWarnings("unchecked")
        List<Object> idRows = em.createNativeQuery("""
                INSERT INTO mensajes (id_padre, id_maestro, id_alumno, id_aula_curso,
                                      asunto, cuerpo, tipo, leido, leido_padre, iniciado_por_maestro, fecha_envio)
                VALUES (:idPadre, :idMaestro, :idAlumno, :idAulaCurso,
                        :asunto, :cuerpo, 'consulta', FALSE, TRUE, FALSE, NOW())
                RETURNING id_mensaje
                """)
                .setParameter("idPadre",    idPadre)
                .setParameter("idMaestro",  idMaestro)
                .setParameter("idAlumno",   req.getIdAlumno())
                .setParameter("idAulaCurso",req.getIdAulaCurso())
                .setParameter("asunto",     req.getAsunto())
                .setParameter("cuerpo",     req.getCuerpo())
                .getResultList();

        long idMensajeNuevo = ((Number) idRows.get(0)).longValue();

        /* ── Broadcast WebSocket: notificar al docente que recibió un nuevo mensaje ── */
        String codigoDocente = (String) em.createNativeQuery(
                "SELECT u.codigo FROM maestros mae JOIN usuarios u ON u.id_usuario=mae.id_usuario WHERE mae.id_maestro=:idMaestro")
                .setParameter("idMaestro", idMaestro)
                .getSingleResult();

        String prevBody = req.getCuerpo().length() > 80
                ? req.getCuerpo().substring(0, 80) + "…" : req.getCuerpo();

        String nombrePadre = (String) em.createNativeQuery(
                "SELECT p.nombre || ' ' || p.apellido FROM padres p JOIN usuarios u ON u.id_usuario=p.id_usuario WHERE u.codigo=:codigo")
                .setParameter("codigo", codigoPadre)
                .getSingleResult();

        NotificacionWsDto notifDocente = new NotificacionWsDto(
                "NUEVO_MENSAJE", idMensajeNuevo, req.getAsunto(), nombrePadre, prevBody, codigoDocente);

        ws.convertAndSend("/topic/mensajes/" + codigoDocente, notifDocente);

        return idMensajeNuevo;
    }
}
