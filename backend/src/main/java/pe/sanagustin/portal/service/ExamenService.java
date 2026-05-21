package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import pe.sanagustin.portal.dto.ActualizarNotaExamenRequest;
import pe.sanagustin.portal.dto.ExamenDto;
import pe.sanagustin.portal.dto.NotaExamenDto;
import pe.sanagustin.portal.dto.NuevoExamenRequest;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ExamenService {

    private final EntityManager em;

    // ────────────────────────────────────────────────────────
    // Listar exámenes de un aula_curso con estadísticas
    // ────────────────────────────────────────────────────────
    public List<ExamenDto> getExamenes(long idAulaCurso, String codigoDocente) {
        verificarAutorizacion(idAulaCurso, codigoDocente);

        String sql = """
                SELECT e.id_examen,
                       e.numero_examen,
                       e.semana,
                       e.clase,
                       e.titulo,
                       e.descripcion,
                       e.tipo,
                       TO_CHAR(e.fecha_examen,   'DD/MM/YYYY') AS fecha_examen,
                       e.duracion_minutos,
                       e.nota_maxima,
                       e.url,
                       TO_CHAR(e.fecha_creacion, 'DD/MM/YYYY') AS fecha_creacion,
                       COUNT(ne.id_nota_examen)                                   AS total_alumnos,
                       COUNT(ne.id_nota_examen) FILTER (WHERE ne.asistio = true)  AS asistieron,
                       COUNT(ne.id_nota_examen) FILTER (WHERE ne.asistio = false) AS no_asistieron,
                       COUNT(ne.id_nota_examen) FILTER (WHERE ne.nota IS NOT NULL) AS calificados
                FROM examenes_curso e
                LEFT JOIN notas_examen ne ON ne.id_examen = e.id_examen
                WHERE e.id_aula_curso = :iac
                GROUP BY e.id_examen
                ORDER BY e.numero_examen, e.fecha_creacion
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("iac", idAulaCurso)
                .getResultList();

        return rows.stream().map(r -> new ExamenDto(
                ((Number) r[0]).longValue(),
                ((Number) r[1]).intValue(),
                ((Number) r[2]).intValue(),
                ((Number) r[3]).intValue(),
                (String)  r[4],
                (String)  r[5],
                (String)  r[6],
                (String)  r[7],
                r[8] != null ? ((Number) r[8]).intValue() : null,
                ((Number) r[9]).intValue(),
                (String)  r[10],
                (String)  r[11],
                ((Number) r[12]).intValue(),
                ((Number) r[13]).intValue(),
                ((Number) r[14]).intValue(),
                ((Number) r[15]).intValue()
        )).toList();
    }

    // ────────────────────────────────────────────────────────
    // Crear examen y generar notas vacías para cada alumno
    // ────────────────────────────────────────────────────────
    @Transactional
    public ExamenDto crearExamen(long idAulaCurso,
                                 NuevoExamenRequest req,
                                 String codigoDocente) {
        verificarAutorizacion(idAulaCurso, codigoDocente);

        String sqlInsert = """
                INSERT INTO examenes_curso
                    (id_aula_curso, numero_examen, semana, clase, titulo,
                     descripcion, tipo, fecha_examen, duracion_minutos, nota_maxima, url)
                VALUES (:iac, :num, :sem, :cla, :titulo,
                        :desc, :tipo, CAST(:fec AS DATE), :dur, :nota, :url)
                RETURNING id_examen
                """;

        Number newId = (Number) em.createNativeQuery(sqlInsert)
                .setParameter("iac",   idAulaCurso)
                .setParameter("num",   req.getNumeroExamen())
                .setParameter("sem",   req.getSemana())
                .setParameter("cla",   req.getClase())
                .setParameter("titulo", req.getTitulo().trim())
                .setParameter("desc",  req.getDescripcion())
                .setParameter("tipo",  req.getTipo())
                .setParameter("fec",   req.getFechaExamen())
                .setParameter("dur",   req.getDuracionMinutos())
                .setParameter("nota",  req.getNotaMaxima())
                .setParameter("url",   req.getUrl())
                .getSingleResult();

        String sqlNotas = """
                INSERT INTO notas_examen (id_examen, id_alumno)
                SELECT :idExamen, m.id_alumno
                FROM matriculas  m
                JOIN aula_cursos ac ON ac.id_aula = m.id_aula
                WHERE ac.id_aula_curso = :iac AND m.estado = 'activa'
                ON CONFLICT DO NOTHING
                """;
        em.createNativeQuery(sqlNotas)
                .setParameter("idExamen", newId.longValue())
                .setParameter("iac",      idAulaCurso)
                .executeUpdate();

        long id = newId.longValue();
        return getExamenes(idAulaCurso, codigoDocente).stream()
                .filter(e -> e.id() == id)
                .findFirst()
                .orElseThrow();
    }

    // ────────────────────────────────────────────────────────
    // Eliminar examen
    // ────────────────────────────────────────────────────────
    @Transactional
    public void eliminarExamen(long idExamen, String codigoDocente) {
        String sql = """
                DELETE FROM examenes_curso e
                WHERE e.id_examen = :id
                  AND e.id_aula_curso IN (
                      SELECT da.id_aula_curso
                      FROM docente_asignaciones da
                      JOIN maestros m ON m.id_maestro = da.id_maestro
                      JOIN usuarios u ON u.id_usuario = m.id_usuario
                      WHERE u.codigo = :codigo AND da.activo = true
                  )
                """;
        int rows = em.createNativeQuery(sql)
                .setParameter("id",     idExamen)
                .setParameter("codigo", codigoDocente)
                .executeUpdate();
        if (rows == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Examen no encontrado o no autorizado");
    }

    // ────────────────────────────────────────────────────────
    // Notas de un examen
    // ────────────────────────────────────────────────────────
    public List<NotaExamenDto> getNotas(long idExamen, String codigoDocente) {
        verificarExamenAutorizacion(idExamen, codigoDocente);

        String sql = """
                SELECT ne.id_nota_examen,
                       a.id_alumno,
                       u.codigo,
                       a.apellido || ' ' || a.nombre AS nombres,
                       ne.asistio,
                       ne.nota
                FROM notas_examen ne
                JOIN alumnos  a ON a.id_alumno  = ne.id_alumno
                JOIN usuarios u ON u.id_usuario = a.id_usuario
                WHERE ne.id_examen = :idExamen
                ORDER BY a.apellido, a.nombre
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("idExamen", idExamen)
                .getResultList();

        return rows.stream().map(r -> new NotaExamenDto(
                ((Number) r[0]).longValue(),
                ((Number) r[1]).longValue(),
                (String)  r[2],
                (String)  r[3],
                (Boolean) r[4],
                r[5] != null ? ((Number) r[5]).doubleValue() : null
        )).toList();
    }

    // ────────────────────────────────────────────────────────
    // Actualizar nota / asistencia de un alumno
    // ────────────────────────────────────────────────────────
    @Transactional
    public NotaExamenDto actualizarNota(long idNotaExamen,
                                        ActualizarNotaExamenRequest req,
                                        String codigoDocente) {
        String checkSql = """
                SELECT COUNT(*) FROM notas_examen ne
                JOIN examenes_curso    e  ON e.id_examen       = ne.id_examen
                JOIN aula_cursos      ac  ON ac.id_aula_curso   = e.id_aula_curso
                JOIN docente_asignaciones da ON da.id_aula_curso = ac.id_aula_curso
                JOIN maestros          m  ON m.id_maestro        = da.id_maestro
                JOIN usuarios          u  ON u.id_usuario        = m.id_usuario
                WHERE ne.id_nota_examen = :id AND u.codigo = :codigo AND da.activo = true
                """;
        Number cnt = (Number) em.createNativeQuery(checkSql)
                .setParameter("id",     idNotaExamen)
                .setParameter("codigo", codigoDocente)
                .getSingleResult();
        if (cnt.longValue() == 0)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");

        StringBuilder set = new StringBuilder();
        if (req.getAsistio() != null) set.append("asistio = :asi");
        if (req.getNota()    != null) {
            if (set.length() > 0) set.append(", ");
            set.append("nota = :nota");
        }
        if (set.isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sin campos a actualizar");

        var q = em.createNativeQuery("UPDATE notas_examen SET " + set + " WHERE id_nota_examen = :id")
                .setParameter("id", idNotaExamen);
        if (req.getAsistio() != null) q.setParameter("asi",  req.getAsistio());
        if (req.getNota()    != null) q.setParameter("nota", req.getNota());
        q.executeUpdate();

        String fetchSql = """
                SELECT ne.id_nota_examen, a.id_alumno, u.codigo,
                       a.apellido || ' ' || a.nombre, ne.asistio, ne.nota
                FROM notas_examen ne
                JOIN alumnos  a ON a.id_alumno  = ne.id_alumno
                JOIN usuarios u ON u.id_usuario = a.id_usuario
                WHERE ne.id_nota_examen = :id
                """;
        Object[] r = (Object[]) em.createNativeQuery(fetchSql)
                .setParameter("id", idNotaExamen)
                .getSingleResult();
        return new NotaExamenDto(
                ((Number) r[0]).longValue(),
                ((Number) r[1]).longValue(),
                (String)  r[2],
                (String)  r[3],
                (Boolean) r[4],
                r[5] != null ? ((Number) r[5]).doubleValue() : null
        );
    }

    // ────────────────────────────────────────────────────────
    // Helpers de autorización
    // ────────────────────────────────────────────────────────
    private void verificarAutorizacion(long idAulaCurso, String codigoDocente) {
        String sql = """
                SELECT COUNT(*) FROM docente_asignaciones da
                JOIN maestros m ON m.id_maestro = da.id_maestro
                JOIN usuarios u ON u.id_usuario = m.id_usuario
                WHERE da.id_aula_curso = :iac AND u.codigo = :codigo AND da.activo = true
                """;
        Number cnt = (Number) em.createNativeQuery(sql)
                .setParameter("iac",    idAulaCurso)
                .setParameter("codigo", codigoDocente)
                .getSingleResult();
        if (cnt.longValue() == 0)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
    }

    private void verificarExamenAutorizacion(long idExamen, String codigoDocente) {
        String sql = """
                SELECT COUNT(*) FROM examenes_curso e
                JOIN docente_asignaciones da ON da.id_aula_curso = e.id_aula_curso
                JOIN maestros m ON m.id_maestro = da.id_maestro
                JOIN usuarios u ON u.id_usuario = m.id_usuario
                WHERE e.id_examen = :id AND u.codigo = :codigo AND da.activo = true
                """;
        Number cnt = (Number) em.createNativeQuery(sql)
                .setParameter("id",     idExamen)
                .setParameter("codigo", codigoDocente)
                .getSingleResult();
        if (cnt.longValue() == 0)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
    }
}
