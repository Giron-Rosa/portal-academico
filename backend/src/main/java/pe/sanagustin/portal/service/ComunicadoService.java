package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import pe.sanagustin.portal.dto.AulaDto;
import pe.sanagustin.portal.dto.ComunicadoDto;
import pe.sanagustin.portal.dto.NuevoComunicadoRequest;
import pe.sanagustin.portal.dto.TipoEventoDto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Lógica de negocio para los comunicados del docente.
 *
 * getComunicados  → lista de comunicados del docente, ordenados por fecha_evento ASC
 * getMisAulas     → aulas (grado + sección) asignadas al docente para el selector del form
 * crearComunicado → inserta un nuevo comunicado
 */
@Service
public class ComunicadoService {

    @PersistenceContext
    private EntityManager em;

    // ────────────────────────────────────────────────────────────
    // Tipos de evento
    // ────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public List<TipoEventoDto> getTiposEvento() {
        List<Object[]> rows = em.createNativeQuery(
                "SELECT id_tipo, nombre, color_fondo, color_texto FROM tipos_evento WHERE activo = TRUE ORDER BY id_tipo")
                .getResultList();
        return rows.stream().map(r -> new TipoEventoDto(
                ((Number) r[0]).longValue(),
                (String)  r[1],
                (String)  r[2],
                (String)  r[3]
        )).toList();
    }

    @Transactional
    public TipoEventoDto crearTipoEvento(String nombre) {
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(
                "INSERT INTO tipos_evento (nombre) VALUES (:nombre) RETURNING id_tipo, nombre, color_fondo, color_texto")
                .setParameter("nombre", nombre.trim())
                .getResultList();
        Object[] r = rows.get(0);
        return new TipoEventoDto(((Number) r[0]).longValue(), (String) r[1], (String) r[2], (String) r[3]);
    }

    // ────────────────────────────────────────────────────────────
    // Listar comunicados del docente
    // ────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public List<ComunicadoDto> getComunicados(String codigoDocente) {

        /* Paso 1: obtener filas base (una por comunicado) */
        String sql = """
            SELECT
                c.id_comunicado,
                c.titulo,
                c.descripcion,
                c.tipo,
                TO_CHAR(c.fecha_evento,   'DD/MM/YYYY')         AS fecha_evento,
                TO_CHAR(c.hora_evento,    'HH24:MI')            AS hora_evento,
                TO_CHAR(c.fecha_creacion, 'DD/MM/YYYY HH24:MI') AS fecha_creacion
            FROM comunicados c
            JOIN maestros  m ON m.id_maestro = c.id_maestro
            JOIN usuarios  u ON u.id_usuario = m.id_usuario
            WHERE u.codigo = :codigo
            ORDER BY c.fecha_evento ASC NULLS LAST, c.fecha_creacion DESC
            """;

        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("codigo", codigoDocente)
                .getResultList();

        if (rows.isEmpty()) return List.of();

        /* Paso 2: para cada comunicado, obtener sus aulas desde comunicado_aulas */
        List<Long> ids = rows.stream().map(r -> ((Number) r[0]).longValue()).toList();
        String aulaSql = """
            SELECT ca.id_comunicado,
                   a.id_aula,
                   g.nombre  AS grado,
                   s.nombre  AS seccion
            FROM comunicado_aulas ca
            JOIN aulas      a ON a.id_aula    = ca.id_aula
            JOIN grados     g ON g.id_grado   = a.id_grado
            JOIN secciones  s ON s.id_seccion = a.id_seccion
            WHERE ca.id_comunicado IN (:ids)
            ORDER BY ca.id_comunicado, g.nombre, s.nombre
            """;

        List<Object[]> aulaRows = em.createNativeQuery(aulaSql)
                .setParameter("ids", ids)
                .getResultList();

        /* Agrupar aulas por id_comunicado */
        Map<Long, List<Object[]>> aulaMap = new LinkedHashMap<>();
        for (Object[] ar : aulaRows) {
            long cid = ((Number) ar[0]).longValue();
            aulaMap.computeIfAbsent(cid, k -> new ArrayList<>()).add(ar);
        }

        return rows.stream().map(r -> {
            long    id            = ((Number) r[0]).longValue();
            String  titulo        = (String)  r[1];
            String  descripcion   = (String)  r[2];
            String  tipo          = (String)  r[3];
            String  fechaEvento   = (String)  r[4];
            String  horaEvento    = (String)  r[5];
            String  fechaCreacion = (String)  r[6];

            List<Object[]> aulasDelCom = aulaMap.getOrDefault(id, List.of());
            List<Long> idAulas = aulasDelCom.stream()
                    .map(ar -> ((Number) ar[1]).longValue()).toList();

            String  grado   = aulasDelCom.isEmpty() ? "Todos los grados" : (String) aulasDelCom.get(0)[2];
            String  seccion = aulasDelCom.isEmpty() ? null               : (String) aulasDelCom.get(0)[3];
            Long    idAula  = aulasDelCom.isEmpty() ? null               : ((Number) aulasDelCom.get(0)[1]).longValue();

            return new ComunicadoDto(id, titulo, descripcion, tipo,
                    fechaEvento, horaEvento, fechaCreacion,
                    grado, seccion, idAula, idAulas);
        }).toList();
    }

    // ────────────────────────────────────────────────────────────
    // Aulas del docente (para el selector del formulario)
    // ────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public List<AulaDto> getMisAulas(String codigoDocente) {

        String sql = """
            SELECT DISTINCT a.id_aula,
                            g.nombre  AS grado,
                            s.nombre  AS seccion
            FROM aula_cursos         ac
            JOIN docente_asignaciones da ON da.id_aula_curso = ac.id_aula_curso
            JOIN maestros              m ON m.id_maestro      = da.id_maestro
            JOIN usuarios              u ON u.id_usuario      = m.id_usuario
            JOIN aulas                 a ON a.id_aula         = ac.id_aula
            JOIN grados                g ON g.id_grado        = a.id_grado
            JOIN secciones             s ON s.id_seccion      = a.id_seccion
            WHERE u.codigo = :codigo
            ORDER BY g.nombre, s.nombre
            """;

        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("codigo", codigoDocente)
                .getResultList();

        return rows.stream().map(r -> new AulaDto(
                ((Number) r[0]).longValue(),
                (String)  r[1],
                (String)  r[2]
        )).toList();
    }

    // ────────────────────────────────────────────────────────────
    // Crear un comunicado nuevo (con multi-aula y hora)
    // ────────────────────────────────────────────────────────────

    @Transactional
    public ComunicadoDto crearComunicado(NuevoComunicadoRequest req,
                                         String codigoDocente) {

        LocalDate fechaEvento = null;
        if (req.getFechaEvento() != null && !req.getFechaEvento().isBlank()) {
            fechaEvento = LocalDate.parse(req.getFechaEvento(), DateTimeFormatter.ISO_LOCAL_DATE);
        }

        LocalTime horaEvento = null;
        if (req.getHoraEvento() != null && !req.getHoraEvento().isBlank()) {
            horaEvento = LocalTime.parse(req.getHoraEvento(), DateTimeFormatter.ofPattern("HH:mm"));
        }

        String insertSql = """
            INSERT INTO comunicados
                (id_maestro, titulo, descripcion, tipo, fecha_evento, hora_evento)
            VALUES (
                (SELECT m.id_maestro FROM maestros m
                 JOIN usuarios u ON u.id_usuario = m.id_usuario WHERE u.codigo = :codigo),
                :titulo, :descripcion, :tipo, :fechaEvento, :horaEvento
            )
            RETURNING id_comunicado
            """;

        Number newId = (Number) em.createNativeQuery(insertSql)
                .setParameter("codigo",      codigoDocente)
                .setParameter("titulo",      req.getTitulo())
                .setParameter("descripcion", req.getDescripcion())
                .setParameter("tipo",        req.getTipo())
                .setParameter("fechaEvento", fechaEvento)
                .setParameter("horaEvento",  horaEvento)
                .getSingleResult();

        long idCom = newId.longValue();

        /* Insertar relaciones aula ↔ comunicado */
        if (req.getIdAulas() != null && !req.getIdAulas().isEmpty()) {
            for (Long idAula : req.getIdAulas()) {
                em.createNativeQuery(
                        "INSERT INTO comunicado_aulas (id_comunicado, id_aula) VALUES (:idC, :idA)")
                        .setParameter("idC", idCom)
                        .setParameter("idA", idAula)
                        .executeUpdate();
            }
        }

        return getComunicados(codigoDocente).stream()
                .filter(c -> c.id() == idCom)
                .findFirst()
                .orElseThrow();
    }

    // ────────────────────────────────────────────────────────────
    // Eliminar un comunicado
    // ────────────────────────────────────────────────────────────

    @Transactional
    public void eliminarComunicado(long idComunicado, String codigoDocente) {
        String sql = """
            DELETE FROM comunicados
            WHERE id_comunicado = :id
              AND id_maestro = (
                  SELECT m.id_maestro FROM maestros m
                  JOIN usuarios u ON u.id_usuario = m.id_usuario WHERE u.codigo = :codigo
              )
            """;
        int rows = em.createNativeQuery(sql)
                .setParameter("id",     idComunicado)
                .setParameter("codigo", codigoDocente)
                .executeUpdate();

        if (rows == 0) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.NOT_FOUND,
                    "Comunicado no encontrado o no autorizado");
        }
    }
}
