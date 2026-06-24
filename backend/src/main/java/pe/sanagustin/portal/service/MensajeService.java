package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import pe.sanagustin.portal.dto.AlumnoContextoDto;
import pe.sanagustin.portal.dto.MensajeDetalleDto;
import pe.sanagustin.portal.dto.MensajeResumenDto;
import pe.sanagustin.portal.dto.RespuestaResumenDto;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MensajeService {

    private final EntityManager em;

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
            SUBSTRING(m.cuerpo FROM 1 FOR 60)            AS ultima_respuesta
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
                (String)   r[13],                                   // cuerpo completo (after COLS_COMUNES 0-12)
                respuestas
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
        em.createNativeQuery("""
                INSERT INTO mensajes_respuestas (id_mensaje, id_usuario, cuerpo)
                VALUES (:idMsg,
                        (SELECT id_usuario FROM usuarios WHERE codigo = :codigo),
                        :cuerpo)
                """)
                .setParameter("idMsg",   idMensaje)
                .setParameter("codigo",  codigoDocente)
                .setParameter("cuerpo",  cuerpo)
                .executeUpdate();
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
}
