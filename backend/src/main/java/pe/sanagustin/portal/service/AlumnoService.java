package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.sanagustin.portal.dto.*;

import java.util.List;

@Service
public class AlumnoService {

    @PersistenceContext
    private EntityManager em;

    // ──────────────────────────────────────────────────────────────────
    // Mis cursos
    // ──────────────────────────────────────────────────────────────────
    public List<CursoAlumnoDto> getMisCursos(String codigo) {
        String sql = """
                SELECT
                    ac.id_aula_curso   AS id_aula_curso,
                    c.nombre           AS nombre,
                    c.area             AS area,
                    ac.horas_semana    AS horas_semana,
                    g.nombre           AS grado,
                    s.nombre           AS seccion,
                    a.turno            AS turno,
                    p.nombre           AS periodo,
                    COALESCE(m.nombre || ' ' || m.apellido, 'Sin docente') AS docente
                FROM alumnos al
                JOIN usuarios u   ON u.id_usuario  = al.id_usuario
                JOIN matriculas mat ON mat.id_alumno = al.id_alumno AND mat.estado = 'activa'
                JOIN aulas a       ON a.id_aula     = mat.id_aula
                JOIN grados g      ON g.id_grado    = a.id_grado
                JOIN secciones s   ON s.id_seccion  = a.id_seccion
                JOIN periodos_academicos p ON p.id_periodo = a.id_periodo AND p.activo = TRUE
                JOIN aula_cursos ac ON ac.id_aula   = a.id_aula
                JOIN cursos c       ON c.id_curso   = ac.id_curso
                LEFT JOIN docente_asignaciones da ON da.id_aula_curso = ac.id_aula_curso AND da.activo = TRUE
                LEFT JOIN maestros m ON m.id_maestro = da.id_maestro
                WHERE u.codigo = :codigo
                ORDER BY c.nombre
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("codigo", codigo)
                .getResultList();

        return rows.stream().map(r -> new CursoAlumnoDto(
                ((Number) r[0]).longValue(),  // idAulaCurso
                (String)  r[1],              // nombre
                (String)  r[2],              // area
                ((Number) r[3]).intValue(),  // horasSemana
                (String)  r[4],              // grado
                (String)  r[5],              // seccion
                (String)  r[6],              // turno
                (String)  r[7],              // periodo
                (String)  r[8]               // docente
        )).toList();
    }

    // ──────────────────────────────────────────────────────────────────
    // Asistencia del alumno en un aula-curso
    // ──────────────────────────────────────────────────────────────────
    public AsistenciaCursoDto getAsistencia(String codigoAlumno, long idAulaCurso) {
        String sqlHistorial = """
                SELECT TO_CHAR(aa.fecha, 'YYYY-MM-DD'), aa.estado, aa.justificante
                FROM asistencia_alumno aa
                JOIN alumnos al ON al.id_alumno = aa.id_alumno
                JOIN usuarios u ON u.id_usuario = al.id_usuario
                WHERE u.codigo = :codigo AND aa.id_aula_curso = :idAulaCurso
                ORDER BY aa.fecha DESC
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sqlHistorial)
                .setParameter("codigo", codigoAlumno)
                .setParameter("idAulaCurso", idAulaCurso)
                .getResultList();

        List<AsistenciaRegistroDto> historial = rows.stream().map(r ->
                new AsistenciaRegistroDto((String) r[0], (String) r[1], (String) r[2])
        ).toList();

        int total       = historial.size();
        int presente    = (int) historial.stream().filter(h -> "presente".equals(h.estado())).count();
        int tardanza    = (int) historial.stream().filter(h -> "tardanza".equals(h.estado())).count();
        int falta       = (int) historial.stream().filter(h -> "falta".equals(h.estado())).count();
        int justificado = (int) historial.stream().filter(h -> "justificado".equals(h.estado())).count();
        double pct = total == 0 ? 100.0 : Math.round((presente + tardanza + justificado) * 1000.0 / total) / 10.0;

        return new AsistenciaCursoDto(historial, total, presente, tardanza, falta, justificado, pct);
    }

    // ──────────────────────────────────────────────────────────────────
    // Materiales del curso (Contenido)
    // ──────────────────────────────────────────────────────────────────
    public List<MaterialAlumnoDto> getContenido(long idAulaCurso) {
        String sql = """
                SELECT mc.id_material,
                       mc.semana,
                       mc.clase,
                       mc.titulo,
                       mc.tipo,
                       mc.url,
                       TO_CHAR(mc.fecha_creacion, 'DD/MM/YYYY') AS fecha
                FROM materiales_curso mc
                WHERE mc.id_aula_curso = :idAulaCurso
                ORDER BY mc.semana, mc.clase, mc.id_material
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("idAulaCurso", idAulaCurso)
                .getResultList();

        return rows.stream().map(r -> new MaterialAlumnoDto(
                ((Number) r[0]).longValue(),
                ((Number) r[1]).intValue(),
                ((Number) r[2]).intValue(),
                (String) r[3],
                (String) r[4],
                (String) r[5],
                (String) r[6]
        )).toList();
    }

    // ──────────────────────────────────────────────────────────────────
    // Tareas del alumno en un aula-curso
    // ──────────────────────────────────────────────────────────────────
    public List<TareaAlumnoDto> getTareas(String codigoAlumno, long idAulaCurso) {
        String sql = """
                SELECT tc.id_tarea,
                       tc.numero_tarea,
                       tc.semana,
                       tc.clase,
                       tc.titulo,
                       tc.descripcion,
                       tc.tipo_entregable,
                       TO_CHAR(tc.fecha_entrega, 'YYYY-MM-DD'),
                       tc.nota_maxima,
                       nt.nota,
                       nt.entregado
                FROM tareas_curso tc
                LEFT JOIN notas_tarea nt ON nt.id_tarea = tc.id_tarea
                    AND nt.id_alumno = (
                        SELECT al.id_alumno FROM alumnos al
                        JOIN usuarios u ON u.id_usuario = al.id_usuario
                        WHERE u.codigo = :codigo
                    )
                WHERE tc.id_aula_curso = :idAulaCurso
                ORDER BY tc.semana, tc.clase, tc.numero_tarea
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("codigo", codigoAlumno)
                .setParameter("idAulaCurso", idAulaCurso)
                .getResultList();

        return rows.stream().map(r -> new TareaAlumnoDto(
                ((Number) r[0]).longValue(),
                ((Number) r[1]).intValue(),
                ((Number) r[2]).intValue(),
                ((Number) r[3]).intValue(),
                (String)  r[4],
                (String)  r[5],
                (String)  r[6],
                (String)  r[7],
                ((Number) r[8]).intValue(),
                r[9] != null ? ((Number) r[9]).doubleValue() : null,
                r[10] != null && (Boolean) r[10]
        )).toList();
    }

    // ──────────────────────────────────────────────────────────────────
    // Marcar tarea como entregada (desde el Kanban del alumno)
    // ──────────────────────────────────────────────────────────────────
    @Transactional
    public void marcarEntregada(String codigoAlumno, long idAulaCurso, long idTarea) {
        // Upsert: si ya existe el registro en notas_tarea, actualizar entregado=true;
        // si no existe, insertar uno nuevo con entregado=true y nota=NULL.
        String upsertSql = """
                INSERT INTO notas_tarea (id_tarea, id_alumno, entregado)
                VALUES (:idTarea,
                        (SELECT al.id_alumno FROM alumnos al
                         JOIN usuarios u ON u.id_usuario = al.id_usuario
                         WHERE u.codigo = :codigo),
                        TRUE)
                ON CONFLICT (id_tarea, id_alumno)
                DO UPDATE SET entregado = TRUE
                WHERE notas_tarea.id_tarea = :idTarea
                """;
        em.createNativeQuery(upsertSql)
                .setParameter("idTarea", idTarea)
                .setParameter("codigo", codigoAlumno)
                .executeUpdate();
    }

    // ──────────────────────────────────────────────────────────────────
    // Anular entrega de tarea (desde el Kanban del alumno)
    // ──────────────────────────────────────────────────────────────────
    @Transactional
    public void anularEntrega(String codigoAlumno, long idAulaCurso, long idTarea) {
        String updateSql = """
                UPDATE notas_tarea
                SET entregado = FALSE,
                    nota = NULL
                WHERE id_tarea = :idTarea
                  AND id_alumno = (
                      SELECT al.id_alumno FROM alumnos al
                      JOIN usuarios u ON u.id_usuario = al.id_usuario
                      WHERE u.codigo = :codigo
                  )
                """;
        em.createNativeQuery(updateSql)
                .setParameter("idTarea", idTarea)
                .setParameter("codigo", codigoAlumno)
                .executeUpdate();
    }


    // ──────────────────────────────────────────────────────────────────
    // Actividades / Exámenes del alumno en un aula-curso
    // ──────────────────────────────────────────────────────────────────
    public List<ActividadAlumnoDto> getActividades(String codigoAlumno, long idAulaCurso) {
        String sql = """
                SELECT ec.id_examen,
                       ec.numero_examen,
                       ec.semana,
                       ec.titulo,
                       ec.descripcion,
                       ec.tipo,
                       TO_CHAR(ec.fecha_examen, 'YYYY-MM-DD'),
                       ec.duracion_minutos,
                       ec.nota_maxima,
                       ne.nota,
                       ne.asistio
                FROM examenes_curso ec
                LEFT JOIN notas_examen ne ON ne.id_examen = ec.id_examen
                    AND ne.id_alumno = (
                        SELECT al.id_alumno FROM alumnos al
                        JOIN usuarios u ON u.id_usuario = al.id_usuario
                        WHERE u.codigo = :codigo
                    )
                WHERE ec.id_aula_curso = :idAulaCurso
                ORDER BY ec.semana, ec.numero_examen
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("codigo", codigoAlumno)
                .setParameter("idAulaCurso", idAulaCurso)
                .getResultList();

        return rows.stream().map(r -> new ActividadAlumnoDto(
                ((Number) r[0]).longValue(),
                ((Number) r[1]).intValue(),
                ((Number) r[2]).intValue(),
                (String)  r[3],
                (String)  r[4],
                (String)  r[5],
                (String)  r[6],
                r[7] != null ? ((Number) r[7]).intValue() : null,
                ((Number) r[8]).intValue(),
                r[9] != null ? ((Number) r[9]).doubleValue() : null,
                r[10] != null && (Boolean) r[10]
        )).toList();
    }

    // ──────────────────────────────────────────────────────────────────
    // Reportes del alumno en un aula-curso
    // ──────────────────────────────────────────────────────────────────
    public List<ReporteAlumnoDto> getReportes(String codigoAlumno, long idAulaCurso) {
        String sql = """
                SELECT ra.id_reporte,
                       ra.tipo,
                       ra.titulo,
                       ra.descripcion,
                       TO_CHAR(ra.fecha, 'DD/MM/YYYY')
                FROM reportes_alumno ra
                JOIN alumnos al ON al.id_alumno = ra.id_alumno
                JOIN usuarios u ON u.id_usuario = al.id_usuario
                WHERE u.codigo = :codigo
                  AND ra.id_aula_curso = :idAulaCurso
                  AND ra.visible_padre = TRUE
                ORDER BY ra.fecha DESC
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("codigo", codigoAlumno)
                .setParameter("idAulaCurso", idAulaCurso)
                .getResultList();

        return rows.stream().map(r -> new ReporteAlumnoDto(
                ((Number) r[0]).longValue(),
                (String) r[1],
                (String) r[2],
                (String) r[3],
                (String) r[4]
        )).toList();
    }

    // ──────────────────────────────────────────────────────────────────
    // Calificaciones globales agrupadas por bimestre
    // ──────────────────────────────────────────────────────────────────
    public List<CalificacionGlobalDto> getCalificacionesGlobales(String codigo) {
        String sql = """
                SELECT 
                    ac.id_aula_curso,
                    c.nombre AS curso,
                    COALESCE(
                      (
                        SELECT ROUND(AVG(nota)::numeric, 1) 
                        FROM (
                          SELECT nt.nota FROM notas_tarea nt 
                          JOIN tareas_curso t ON t.id_tarea = nt.id_tarea
                          WHERE nt.id_alumno = al.id_alumno AND t.id_aula_curso = ac.id_aula_curso AND t.semana <= 4 AND nt.nota IS NOT NULL
                          UNION ALL
                          SELECT ne.nota FROM notas_examen ne
                          JOIN examenes_curso e ON e.id_examen = ne.id_examen
                          WHERE ne.id_alumno = al.id_alumno AND e.id_aula_curso = ac.id_aula_curso AND e.semana <= 4 AND ne.nota IS NOT NULL
                        ) b1
                      ), 
                      NULL
                    ) AS bim1,
                    COALESCE(
                      (
                        SELECT ROUND(AVG(nota)::numeric, 1) 
                        FROM (
                          SELECT nt.nota FROM notas_tarea nt 
                          JOIN tareas_curso t ON t.id_tarea = nt.id_tarea
                          WHERE nt.id_alumno = al.id_alumno AND t.id_aula_curso = ac.id_aula_curso AND t.semana >= 5 AND t.semana <= 8 AND nt.nota IS NOT NULL
                          UNION ALL
                          SELECT ne.nota FROM notas_examen ne
                          JOIN examenes_curso e ON e.id_examen = ne.id_examen
                          WHERE ne.id_alumno = al.id_alumno AND e.id_aula_curso = ac.id_aula_curso AND e.semana >= 5 AND e.semana <= 8 AND ne.nota IS NOT NULL
                        ) b2
                      ), 
                      NULL
                    ) AS bim2,
                    COALESCE(
                      (
                        SELECT ROUND(AVG(nota)::numeric, 1) 
                        FROM (
                          SELECT nt.nota FROM notas_tarea nt 
                          JOIN tareas_curso t ON t.id_tarea = nt.id_tarea
                          WHERE nt.id_alumno = al.id_alumno AND t.id_aula_curso = ac.id_aula_curso AND t.semana >= 9 AND t.semana <= 12 AND nt.nota IS NOT NULL
                          UNION ALL
                          SELECT ne.nota FROM notas_examen ne
                          JOIN examenes_curso e ON e.id_examen = ne.id_examen
                          WHERE ne.id_alumno = al.id_alumno AND e.id_aula_curso = ac.id_aula_curso AND e.semana >= 9 AND e.semana <= 12 AND ne.nota IS NOT NULL
                        ) b3
                      ), 
                      NULL
                    ) AS bim3,
                    COALESCE(
                      (
                        SELECT ROUND(AVG(nota)::numeric, 1) 
                        FROM (
                          SELECT nt.nota FROM notas_tarea nt 
                          JOIN tareas_curso t ON t.id_tarea = nt.id_tarea
                          WHERE nt.id_alumno = al.id_alumno AND t.id_aula_curso = ac.id_aula_curso AND t.semana >= 13 AND nt.nota IS NOT NULL
                          UNION ALL
                          SELECT ne.nota FROM notas_examen ne
                          JOIN examenes_curso e ON e.id_examen = ne.id_examen
                          WHERE ne.id_alumno = al.id_alumno AND e.id_aula_curso = ac.id_aula_curso AND e.semana >= 13 AND ne.nota IS NOT NULL
                        ) b4
                      ), 
                      NULL
                    ) AS bim4
                FROM alumnos al
                JOIN usuarios u ON u.id_usuario = al.id_usuario
                JOIN matriculas m ON m.id_alumno = al.id_alumno AND m.estado = 'activa'
                JOIN aula_cursos ac ON ac.id_aula = m.id_aula
                JOIN cursos c ON c.id_curso = ac.id_curso
                WHERE u.codigo = :codigo
                ORDER BY c.nombre
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("codigo", codigo)
                .getResultList();

        return rows.stream().map(r -> new CalificacionGlobalDto(
                ((Number) r[0]).longValue(),
                (String) r[1],
                r[2] != null ? ((Number) r[2]).doubleValue() : null,
                r[3] != null ? ((Number) r[3]).doubleValue() : null,
                r[4] != null ? ((Number) r[4]).doubleValue() : null,
                r[5] != null ? ((Number) r[5]).doubleValue() : null
        )).toList();
    }

    // ──────────────────────────────────────────────────────────────────
    // Asistencia global consolidada por curso
    // ──────────────────────────────────────────────────────────────────
    public List<AsistenciaGlobalDto> getAsistenciasGlobales(String codigo) {
        String sql = """
                SELECT 
                    ac.id_aula_curso,
                    c.nombre AS curso,
                    COUNT(aa.id_asistencia) AS total,
                    SUM(CASE WHEN aa.estado = 'presente' THEN 1 ELSE 0 END) AS presente,
                    SUM(CASE WHEN aa.estado = 'tardanza' THEN 1 ELSE 0 END) AS tardanza,
                    SUM(CASE WHEN aa.estado = 'falta' THEN 1 ELSE 0 END) AS falta,
                    SUM(CASE WHEN aa.estado = 'justificado' THEN 1 ELSE 0 END) AS justificado
                FROM alumnos al
                JOIN usuarios u ON u.id_usuario = al.id_usuario
                JOIN matriculas m ON m.id_alumno = al.id_alumno AND m.estado = 'activa'
                JOIN aula_cursos ac ON ac.id_aula = m.id_aula
                JOIN cursos c ON c.id_curso = ac.id_curso
                LEFT JOIN asistencia_alumno aa ON aa.id_alumno = al.id_alumno AND aa.id_aula_curso = ac.id_aula_curso
                WHERE u.codigo = :codigo
                GROUP BY ac.id_aula_curso, c.nombre, al.id_alumno
                ORDER BY c.nombre
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("codigo", codigo)
                .getResultList();

        return rows.stream().map(r -> {
            int total = r[2] != null ? ((Number) r[2]).intValue() : 0;
            int pres  = r[3] != null ? ((Number) r[3]).intValue() : 0;
            int tard  = r[4] != null ? ((Number) r[4]).intValue() : 0;
            int falt  = r[5] != null ? ((Number) r[5]).intValue() : 0;
            int just  = r[6] != null ? ((Number) r[6]).intValue() : 0;
            double pct = total == 0 ? 100.0 : Math.round((pres + tard + just) * 1000.0 / total) / 10.0;

            return new AsistenciaGlobalDto(
                ((Number) r[0]).longValue(),
                (String) r[1],
                total,
                pres,
                tard,
                falt,
                just,
                pct
            );
        }).toList();
    }
}
