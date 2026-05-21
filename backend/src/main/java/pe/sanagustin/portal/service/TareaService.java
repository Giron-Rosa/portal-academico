package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import pe.sanagustin.portal.dto.ActualizarNotaRequest;
import pe.sanagustin.portal.dto.NotaTareaDto;
import pe.sanagustin.portal.dto.NuevaTareaRequest;
import pe.sanagustin.portal.dto.TareaDto;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TareaService {

    private final EntityManager em;

    // ────────────────────────────────────────────────────────
    // Listar tareas de un aula_curso con estadísticas
    // ────────────────────────────────────────────────────────
    public List<TareaDto> getTareas(long idAulaCurso, String codigoDocente) {
        verificarAutorizacion(idAulaCurso, codigoDocente);

        String sql = """
                SELECT t.id_tarea,
                       t.numero_tarea,
                       t.semana,
                       t.clase,
                       t.titulo,
                       t.descripcion,
                       t.tipo_entregable,
                       TO_CHAR(t.fecha_entrega,  'DD/MM/YYYY') AS fecha_entrega,
                       t.nota_maxima,
                       t.intentos,
                       t.url,
                       TO_CHAR(t.fecha_creacion, 'DD/MM/YYYY') AS fecha_creacion,
                       COUNT(nt.id_nota)                        AS total_alumnos,
                       COUNT(nt.id_nota) FILTER (WHERE nt.entregado = true)  AS entregadas,
                       COUNT(nt.id_nota) FILTER (WHERE nt.entregado = false) AS no_entregadas
                FROM tareas_curso t
                LEFT JOIN notas_tarea nt ON nt.id_tarea = t.id_tarea
                WHERE t.id_aula_curso = :iac
                GROUP BY t.id_tarea
                ORDER BY t.numero_tarea, t.fecha_creacion
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("iac", idAulaCurso)
                .getResultList();

        return rows.stream().map(r -> new TareaDto(
                ((Number) r[0]).longValue(),
                ((Number) r[1]).intValue(),
                ((Number) r[2]).intValue(),
                ((Number) r[3]).intValue(),
                (String) r[4],
                (String) r[5],
                (String) r[6],
                (String) r[7],
                ((Number) r[8]).intValue(),
                ((Number) r[9]).intValue(),
                (String) r[10],
                (String) r[11],
                ((Number) r[12]).intValue(),
                ((Number) r[13]).intValue(),
                ((Number) r[14]).intValue()
        )).toList();
    }

    // ────────────────────────────────────────────────────────
    // Crear tarea y generar notas vacías para cada alumno
    // ────────────────────────────────────────────────────────
    @Transactional
    public TareaDto crearTarea(long idAulaCurso,
                               NuevaTareaRequest req,
                               String codigoDocente) {
        verificarAutorizacion(idAulaCurso, codigoDocente);

        String sqlInsert = """
                INSERT INTO tareas_curso
                    (id_aula_curso, numero_tarea, semana, clase, titulo,
                     descripcion, tipo_entregable, fecha_entrega, nota_maxima, intentos, url)
                VALUES (:iac, :num, :sem, :cla, :titulo,
                        :desc, :tipoEnt, CAST(:fec AS DATE), :nota, :int, :url)
                RETURNING id_tarea
                """;

        Number newId = (Number) em.createNativeQuery(sqlInsert)
                .setParameter("iac",     idAulaCurso)
                .setParameter("num",     req.getNumeroTarea())
                .setParameter("sem",     req.getSemana())
                .setParameter("cla",     req.getClase())
                .setParameter("titulo",  req.getTitulo().trim())
                .setParameter("desc",    req.getDescripcion())
                .setParameter("tipoEnt", req.getTipoEntregable())
                .setParameter("fec",     req.getFechaEntrega())
                .setParameter("nota",    req.getNotaMaxima())
                .setParameter("int",     req.getIntentos())
                .setParameter("url",     req.getUrl())
                .getSingleResult();

        /* Auto-crear entradas de nota para todos los alumnos matriculados */
        String sqlNotas = """
                INSERT INTO notas_tarea (id_tarea, id_alumno)
                SELECT :idTarea, m.id_alumno
                FROM matriculas  m
                JOIN aula_cursos ac ON ac.id_aula = m.id_aula
                WHERE ac.id_aula_curso = :iac AND m.estado = 'activa'
                ON CONFLICT DO NOTHING
                """;
        em.createNativeQuery(sqlNotas)
                .setParameter("idTarea", newId.longValue())
                .setParameter("iac",     idAulaCurso)
                .executeUpdate();

        long id = newId.longValue();
        return getTareas(idAulaCurso, codigoDocente).stream()
                .filter(t -> t.id() == id)
                .findFirst()
                .orElseThrow();
    }

    // ────────────────────────────────────────────────────────
    // Eliminar tarea
    // ────────────────────────────────────────────────────────
    @Transactional
    public void eliminarTarea(long idTarea, String codigoDocente) {
        String sql = """
                DELETE FROM tareas_curso t
                WHERE t.id_tarea = :id
                  AND t.id_aula_curso IN (
                      SELECT da.id_aula_curso
                      FROM docente_asignaciones da
                      JOIN maestros m ON m.id_maestro = da.id_maestro
                      JOIN usuarios u ON u.id_usuario = m.id_usuario
                      WHERE u.codigo = :codigo AND da.activo = true
                  )
                """;
        int rows = em.createNativeQuery(sql)
                .setParameter("id",     idTarea)
                .setParameter("codigo", codigoDocente)
                .executeUpdate();
        if (rows == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND,
                    "Tarea no encontrada o no autorizada");
    }

    // ────────────────────────────────────────────────────────
    // Notas / entregas de una tarea
    // ────────────────────────────────────────────────────────
    public List<NotaTareaDto> getNotas(long idTarea, String codigoDocente) {
        verificarTareaAutorizacion(idTarea, codigoDocente);

        String sql = """
                SELECT nt.id_nota,
                       a.id_alumno,
                       u.codigo,
                       a.apellido || ' ' || a.nombre AS nombres,
                       nt.entregado,
                       nt.nota
                FROM notas_tarea nt
                JOIN alumnos  a ON a.id_alumno  = nt.id_alumno
                JOIN usuarios u ON u.id_usuario = a.id_usuario
                ORDER BY a.apellido, a.nombre
                """;

        /* Filtrar por tarea dentro del sql via subquery para seguridad */
        String sqlFull = """
                SELECT nt.id_nota,
                       a.id_alumno,
                       u.codigo,
                       a.apellido || ' ' || a.nombre AS nombres,
                       nt.entregado,
                       nt.nota
                FROM notas_tarea nt
                JOIN alumnos  a ON a.id_alumno  = nt.id_alumno
                JOIN usuarios u ON u.id_usuario = a.id_usuario
                WHERE nt.id_tarea = :idTarea
                ORDER BY a.apellido, a.nombre
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sqlFull)
                .setParameter("idTarea", idTarea)
                .getResultList();

        return rows.stream().map(r -> new NotaTareaDto(
                ((Number) r[0]).longValue(),
                ((Number) r[1]).longValue(),
                (String) r[2],
                (String) r[3],
                (Boolean) r[4],
                r[5] != null ? ((Number) r[5]).doubleValue() : null
        )).toList();
    }

    // ────────────────────────────────────────────────────────
    // Actualizar nota / entregado de un alumno
    // ────────────────────────────────────────────────────────
    @Transactional
    public NotaTareaDto actualizarNota(long idNota,
                                       ActualizarNotaRequest req,
                                       String codigoDocente) {
        /* Verificar que la nota pertenece a una tarea del docente */
        String checkSql = """
                SELECT COUNT(*) FROM notas_tarea nt
                JOIN tareas_curso  t  ON t.id_tarea       = nt.id_tarea
                JOIN aula_cursos   ac ON ac.id_aula_curso  = t.id_aula_curso
                JOIN docente_asignaciones da ON da.id_aula_curso = ac.id_aula_curso
                JOIN maestros      m  ON m.id_maestro      = da.id_maestro
                JOIN usuarios      u  ON u.id_usuario      = m.id_usuario
                WHERE nt.id_nota = :id AND u.codigo = :codigo AND da.activo = true
                """;
        Number cnt = (Number) em.createNativeQuery(checkSql)
                .setParameter("id",     idNota)
                .setParameter("codigo", codigoDocente)
                .getSingleResult();
        if (cnt.longValue() == 0)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");

        /* Construir SET dinámico, solo añadir parámetros realmente usados */
        StringBuilder set = new StringBuilder();
        if (req.getEntregado() != null) set.append("entregado = :ent");
        if (req.getNota()      != null) {
            if (set.length() > 0) set.append(", ");
            set.append("nota = :nota");
        }
        if (set.isEmpty())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Sin campos a actualizar");

        var q = em.createNativeQuery("UPDATE notas_tarea SET " + set + " WHERE id_nota = :id")
                .setParameter("id", idNota);
        if (req.getEntregado() != null) q.setParameter("ent",  req.getEntregado());
        if (req.getNota()      != null) q.setParameter("nota", req.getNota());
        q.executeUpdate();

        /* Devolver el registro actualizado */
        String fetchSql = """
                SELECT nt.id_nota, a.id_alumno, u.codigo,
                       a.apellido || ' ' || a.nombre, nt.entregado, nt.nota
                FROM notas_tarea nt
                JOIN alumnos  a ON a.id_alumno  = nt.id_alumno
                JOIN usuarios u ON u.id_usuario = a.id_usuario
                WHERE nt.id_nota = :id
                """;
        Object[] r = (Object[]) em.createNativeQuery(fetchSql)
                .setParameter("id", idNota)
                .getSingleResult();
        return new NotaTareaDto(
                ((Number) r[0]).longValue(),
                ((Number) r[1]).longValue(),
                (String) r[2],
                (String) r[3],
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

    private void verificarTareaAutorizacion(long idTarea, String codigoDocente) {
        String sql = """
                SELECT COUNT(*) FROM tareas_curso t
                JOIN docente_asignaciones da ON da.id_aula_curso = t.id_aula_curso
                JOIN maestros m ON m.id_maestro = da.id_maestro
                JOIN usuarios u ON u.id_usuario = m.id_usuario
                WHERE t.id_tarea = :id AND u.codigo = :codigo AND da.activo = true
                """;
        Number cnt = (Number) em.createNativeQuery(sql)
                .setParameter("id",     idTarea)
                .setParameter("codigo", codigoDocente)
                .getSingleResult();
        if (cnt.longValue() == 0)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
    }
}
