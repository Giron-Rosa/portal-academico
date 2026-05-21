package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
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
            g.nombre  AS grado,
            s.nombre  AS seccion,
            c.nombre  AS curso
            """;

    private static final String JOINS_COMUNES = """
            JOIN   padres          p   ON p.id_padre     = m.id_padre
            JOIN   maestros        mae ON mae.id_maestro  = m.id_maestro
            JOIN   usuarios        u   ON u.id_usuario    = mae.id_usuario
            LEFT JOIN alumnos      al  ON al.id_alumno    = m.id_alumno
            LEFT JOIN aula_cursos  ac  ON ac.id_aula_curso = m.id_aula_curso
            LEFT JOIN cursos       c   ON c.id_curso      = ac.id_curso
            LEFT JOIN aulas        a   ON a.id_aula       = ac.id_aula
            LEFT JOIN grados       g   ON g.id_grado      = a.id_grado
            LEFT JOIN secciones    s   ON s.id_seccion    = a.id_seccion
            """;

    /* ─────────────────────────────────────────────────────────
       getMensajes: lista de mensajes para el docente autenticado.
       Se devuelven ordenados: primero los no leídos, luego los
       más recientes. El docente puede filtrar por grado en el
       frontend (no se filtra en el SQL para evitar múltiples
       llamadas).
    ───────────────────────────────────────────────────────── */
    public List<MensajeResumenDto> getMensajes(String codigoDocente) {

        String sql = "SELECT " + COLS_COMUNES +
                "FROM mensajes m " + JOINS_COMUNES +
                "WHERE u.codigo = :codigo " +
                "ORDER BY m.leido ASC, m.fecha_envio DESC";

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("codigo", codigoDocente)
                .getResultList();

        return rows.stream().map(r -> new MensajeResumenDto(
                ((Number)  r[0]).longValue(),   // id
                (String)   r[1],                // asunto
                (String)   r[2],                // tipo
                (Boolean)  r[3],                // leido
                (String)   r[4],                // fechaEnvio
                (String)   r[5],                // nombrePadre
                (String)   r[6],                // nombreAlumno (nullable)
                (String)   r[7],                // grado (nullable)
                (String)   r[8],                // seccion (nullable)
                (String)   r[9]                 // curso (nullable)
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
                ((Number)  r[0]).longValue(),
                (String)   r[1],
                (String)   r[2],
                (Boolean)  r[3],
                (String)   r[4],
                (String)   r[5],
                (String)   r[6],
                (String)   r[7],
                (String)   r[8],
                (String)   r[9],
                (String)   r[10],   // cuerpo completo
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
