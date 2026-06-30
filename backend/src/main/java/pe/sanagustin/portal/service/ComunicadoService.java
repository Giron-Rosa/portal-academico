package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;
import pe.sanagustin.portal.dto.AulaDto;
import pe.sanagustin.portal.dto.ComunicadoDto;
import pe.sanagustin.portal.dto.NuevoComunicadoRequest;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

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
    // Listar comunicados del docente
    // ────────────────────────────────────────────────────────────
    /**
     * Devuelve todos los comunicados creados por el docente identificado
     * por su código de usuario. Incluye tanto los de aula específica
     * como los generales (id_aula IS NULL).
     * Se ordenan primero por fecha_evento ASC (próximos primero),
     * los sin fecha al final, y luego por fecha de creación DESC.
     */
    @SuppressWarnings("unchecked")
    public List<ComunicadoDto> getComunicados(String codigoDocente) {

        String sql = """
            SELECT
                c.id_comunicado,
                c.titulo,
                c.descripcion,
                c.tipo,
                TO_CHAR(c.fecha_evento,   'DD/MM/YYYY')    AS fecha_evento,
                TO_CHAR(c.fecha_creacion, 'DD/MM/YYYY HH24:MI') AS fecha_creacion,
                COALESCE(g.nombre, 'Todos los grados')     AS grado,
                s.nombre                                    AS seccion,
                c.id_aula
            FROM comunicados c
            JOIN maestros  m ON m.id_maestro   = c.id_maestro
            JOIN usuarios  u ON u.id_usuario   = m.id_usuario
            LEFT JOIN aulas    a ON a.id_aula  = c.id_aula
            LEFT JOIN grados   g ON g.id_grado = a.id_grado
            LEFT JOIN secciones s ON s.id_seccion = a.id_seccion
            WHERE u.codigo = :codigo
            ORDER BY c.fecha_evento ASC NULLS LAST, c.fecha_creacion DESC
            """;

        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("codigo", codigoDocente)
                .getResultList();

        return rows.stream().map(r -> new ComunicadoDto(
                ((Number) r[0]).longValue(),          // id
                (String)  r[1],                       // titulo
                (String)  r[2],                       // descripcion
                (String)  r[3],                       // tipo
                (String)  r[4],                       // fechaEvento
                (String)  r[5],                       // fechaCreacion
                (String)  r[6],                       // grado
                (String)  r[7],                       // seccion
                r[8] != null ? ((Number) r[8]).longValue() : null  // idAula
        )).toList();
    }

    // ────────────────────────────────────────────────────────────
    // Aulas del docente (para el selector del formulario)
    // ────────────────────────────────────────────────────────────
    /**
     * Retorna las aulas únicas asignadas al docente.
     * El frontend las usa para poblar el desplegable "¿Para qué grado?"
     * en el formulario de creación de comunicados.
     */
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
    // Crear un comunicado nuevo
    // ────────────────────────────────────────────────────────────
    /**
     * Inserta un comunicado para el docente.
     * Si req.getIdAula() es null se crea como comunicado general
     * (visible para todos los grados del docente).
     * Si req.getFechaEvento() viene con formato "YYYY-MM-DD" lo parsea
     * a java.time.LocalDate; si viene vacío/null deja NULL en BD.
     */
    @Transactional
    public ComunicadoDto crearComunicado(NuevoComunicadoRequest req,
                                         String codigoDocente) {

        // Parsear fecha si existe
        LocalDate fechaEvento = null;
        if (req.getFechaEvento() != null && !req.getFechaEvento().isBlank()) {
            fechaEvento = LocalDate.parse(req.getFechaEvento(),
                    DateTimeFormatter.ISO_LOCAL_DATE);
        }

        // INSERT usando subquery para obtener id_maestro del código
        String insertSql = """
            INSERT INTO comunicados
                (id_maestro, id_aula, titulo, descripcion, tipo, fecha_evento)
            VALUES (
                (SELECT m.id_maestro
                 FROM maestros m
                 JOIN usuarios u ON u.id_usuario = m.id_usuario
                 WHERE u.codigo = :codigo),
                :idAula,
                :titulo,
                :descripcion,
                :tipo,
                :fechaEvento
            )
            RETURNING id_comunicado
            """;

        Long targetAulaId = req.getIdAula();
        if (targetAulaId == null && req.getIdAulas() != null && !req.getIdAulas().isEmpty()) {
            targetAulaId = req.getIdAulas().get(0);
        }

        Number newId = (Number) em.createNativeQuery(insertSql)
                .setParameter("codigo",      codigoDocente)
                .setParameter("idAula",      targetAulaId)
                .setParameter("titulo",      req.getTitulo())
                .setParameter("descripcion", req.getDescripcion())
                .setParameter("tipo",        req.getTipo())
                .setParameter("fechaEvento", fechaEvento)
                .getSingleResult();

        // Recuperar el comunicado recién creado para devolverlo al frontend
        List<ComunicadoDto> list = getComunicados(codigoDocente);
        return list.stream()
                .filter(c -> c.id() == newId.longValue())
                .findFirst()
                .orElseThrow();
    }

    // ────────────────────────────────────────────────────────────
    // Eliminar un comunicado
    // ────────────────────────────────────────────────────────────
    /**
     * Elimina el comunicado solo si pertenece al docente autenticado.
     * Lanza 404 si no existe o no corresponde al docente.
     */
    @Transactional
    public void eliminarComunicado(long idComunicado, String codigoDocente) {
        String sql = """
            DELETE FROM comunicados
            WHERE id_comunicado = :id
              AND id_maestro = (
                  SELECT m.id_maestro
                  FROM maestros m
                  JOIN usuarios u ON u.id_usuario = m.id_usuario
                  WHERE u.codigo = :codigo
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
