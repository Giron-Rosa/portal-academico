package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pe.sanagustin.portal.dto.CursoDetalleHijoDto;
import pe.sanagustin.portal.dto.CursoHijoDto;
import pe.sanagustin.portal.dto.ExamenHijoDto;
import pe.sanagustin.portal.dto.HijoResumenDto;
import pe.sanagustin.portal.dto.TareaHijoDto;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PadreService {

    private final EntityManager entityManager;

    public List<HijoResumenDto> getResumen(String codigoPadre) {

        String sqlHijos = """
                SELECT a.id_alumno,
                       a.nombre,
                       a.apellido,
                       u_a.codigo        AS codigo_alumno,
                       g.nombre          AS grado,
                       s.nombre          AS seccion,
                       au.turno,
                       p.nombre          AS periodo,
                       ph.parentesco
                FROM padre_hijo ph
                JOIN alumnos              a   ON a.id_alumno   = ph.id_alumno
                JOIN usuarios             u_a ON u_a.id_usuario = a.id_usuario
                JOIN matriculas           m   ON m.id_alumno   = a.id_alumno
                                             AND m.estado      = 'activa'
                JOIN aulas                au  ON au.id_aula    = m.id_aula
                JOIN grados               g   ON g.id_grado    = au.id_grado
                JOIN secciones            s   ON s.id_seccion  = au.id_seccion
                JOIN periodos_academicos  p   ON p.id_periodo  = au.id_periodo
                JOIN padres               pad ON pad.id_padre  = ph.id_padre
                JOIN usuarios             u_p ON u_p.id_usuario = pad.id_usuario
                WHERE u_p.codigo = :codigo
                ORDER BY g.orden
                """;

        String sqlCursos = """
                SELECT c.nombre,
                       c.area,
                       ac.horas_semana,
                       COALESCE(mae.nombre || ' ' || mae.apellido, 'Sin asignar') AS docente,
                       (SELECT COUNT(*) FROM tareas_curso WHERE id_aula_curso = ac.id_aula_curso) AS total_tareas,
                       (SELECT COUNT(*) FROM notas_tarea nt 
                        JOIN tareas_curso tc ON tc.id_tarea = nt.id_tarea 
                        WHERE nt.id_alumno = :idAlumno AND tc.id_aula_curso = ac.id_aula_curso AND nt.entregado = true) AS entregadas,
                       COALESCE((SELECT ROUND(AVG(nt.nota)::numeric, 1) FROM notas_tarea nt 
                                 JOIN tareas_curso tc ON tc.id_tarea = nt.id_tarea 
                                 WHERE nt.id_alumno = :idAlumno AND tc.id_aula_curso = ac.id_aula_curso AND nt.entregado = true AND nt.nota IS NOT NULL), 0.0) AS promedio,
                       (SELECT COUNT(*) FROM asistencia_alumno WHERE id_alumno = :idAlumno AND id_aula_curso = ac.id_aula_curso) AS asist_total,
                       (SELECT COUNT(*) FROM asistencia_alumno WHERE id_alumno = :idAlumno AND id_aula_curso = ac.id_aula_curso AND estado IN ('presente', 'tardanza', 'justificado')) AS asist_pres
                FROM matriculas m
                JOIN aula_cursos         ac  ON ac.id_aula       = m.id_aula
                JOIN cursos              c   ON c.id_curso       = ac.id_curso
                LEFT JOIN docente_asignaciones da
                                             ON da.id_aula_curso = ac.id_aula_curso
                                            AND da.activo        = true
                LEFT JOIN maestros       mae ON mae.id_maestro   = da.id_maestro
                WHERE m.id_alumno = :idAlumno
                  AND m.estado    = 'activa'
                ORDER BY c.nombre
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> hijoRows = entityManager
                .createNativeQuery(sqlHijos)
                .setParameter("codigo", codigoPadre)
                .getResultList();

        List<HijoResumenDto> resultado = new ArrayList<>();

        for (Object[] r : hijoRows) {
            Long idAlumno = ((Number) r[0]).longValue();

            @SuppressWarnings("unchecked")
            List<Object[]> cursoRows = entityManager
                    .createNativeQuery(sqlCursos)
                    .setParameter("idAlumno", idAlumno)
                    .getResultList();

            List<CursoHijoDto> cursos = new ArrayList<>();
            double sumPromedio = 0;
            double sumAsistencia = 0;
            int totalEntregadas = 0;
            int totalTareas = 0;
            int cursosRiesgo = 0;

            for (Object[] c : cursoRows) {
                String cNombre = (String) c[0];
                String cArea = (String) c[1];
                Integer cHoras = (Integer) c[2];
                String cDocente = (String) c[3];
                int tTotal = ((Number) c[4]).intValue();
                int tEntregadas = ((Number) c[5]).intValue();
                double cPromedio = ((Number) c[6]).doubleValue();
                long aTotal = ((Number) c[7]).longValue();
                long aPres = ((Number) c[8]).longValue();

                double cAsistencia = aTotal == 0 ? 100.0 : Math.round((aPres * 100.0) / aTotal * 10.0) / 10.0;
                int cProgreso = tTotal == 0 ? 100 : (tEntregadas * 100) / tTotal;

                if (cPromedio < 11.0 && tTotal > 0) {
                    cursosRiesgo++;
                }

                sumPromedio += cPromedio;
                sumAsistencia += cAsistencia;
                totalEntregadas += tEntregadas;
                totalTareas += tTotal;

                cursos.add(new CursoHijoDto(
                        cNombre, cArea, cHoras, cDocente,
                        cProgreso, tEntregadas, tTotal, cPromedio, cAsistencia
                ));
            }

            int nCursos = cursos.size();
            double promedioGral = nCursos == 0 ? 0.0 : Math.round((sumPromedio / nCursos) * 10.0) / 10.0;
            double asistenciaGral = nCursos == 0 ? 100.0 : Math.round((sumAsistencia / nCursos) * 10.0) / 10.0;
            double entregaGral = totalTareas == 0 ? 100.0 : Math.round((totalEntregadas * 100.0) / totalTareas * 10.0) / 10.0;

            // Determinar estado de riesgo
            String estado = "bueno";
            if (asistenciaGral < 80.0 || cursosRiesgo > 0) {
                estado = "riesgo";
            } else if (asistenciaGral < 90.0 || promedioGral < 13.0) {
                estado = "observacion";
            }

            resultado.add(new HijoResumenDto(
                    (String) r[1],
                    (String) r[2],
                    (String) r[3],
                    (String) r[4],
                    (String) r[5],
                    (String) r[6],
                    (String) r[7],
                    (String) r[8],
                    promedioGral,
                    asistenciaGral,
                    cursosRiesgo,
                    entregaGral,
                    estado,
                    cursos
            ));
        }

        return resultado;
    }

    /**
     * getCursosDetalle: devuelve los cursos del alumno identificado por codigoAlumno
     * con sus tareas individuales (nota, entregado) y exámenes (nota, asistió).
     * Solo se permite si el padre autenticado tiene relación con ese alumno.
     */
    public List<CursoDetalleHijoDto> getCursosDetalle(String codigoPadre, String codigoAlumno) {

        // Verificar relación padre-hijo
        @SuppressWarnings("unchecked")
        List<?> check = entityManager.createNativeQuery("""
                SELECT 1
                FROM padre_hijo ph
                JOIN padres   p   ON p.id_padre     = ph.id_padre
                JOIN usuarios u_p ON u_p.id_usuario = p.id_usuario
                JOIN alumnos  a   ON a.id_alumno    = ph.id_alumno
                JOIN usuarios u_a ON u_a.id_usuario = a.id_usuario
                WHERE u_p.codigo = :codPadre AND u_a.codigo = :codAlumno
                """)
                .setParameter("codPadre",  codigoPadre)
                .setParameter("codAlumno", codigoAlumno)
                .getResultList();

        if (check.isEmpty()) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.FORBIDDEN, "Acceso no autorizado");
        }

        // Obtener id_alumno
        Long idAlumno = ((Number) entityManager.createNativeQuery(
                "SELECT a.id_alumno FROM alumnos a JOIN usuarios u ON u.id_usuario=a.id_usuario WHERE u.codigo=:cod")
                .setParameter("cod", codigoAlumno)
                .getSingleResult()).longValue();

        // Obtener cursos de matrícula activa
        String sqlCursos = """
                SELECT ac.id_aula_curso,
                       c.nombre,
                       c.area,
                       COALESCE(mae.nombre || ' ' || mae.apellido, 'Sin asignar') AS docente
                FROM matriculas m
                JOIN aula_cursos ac ON ac.id_aula = m.id_aula
                JOIN cursos      c  ON c.id_curso = ac.id_curso
                LEFT JOIN docente_asignaciones da ON da.id_aula_curso = ac.id_aula_curso AND da.activo = TRUE
                LEFT JOIN maestros mae ON mae.id_maestro = da.id_maestro
                WHERE m.id_alumno = :idAlumno AND m.estado = 'activa'
                ORDER BY c.nombre
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> cursoRows = entityManager.createNativeQuery(sqlCursos)
                .setParameter("idAlumno", idAlumno)
                .getResultList();

        List<CursoDetalleHijoDto> resultado = new ArrayList<>();

        for (Object[] cr : cursoRows) {
            long idAulaCurso = ((Number) cr[0]).longValue();
            String cNombre   = (String) cr[1];
            String cArea     = (String) cr[2];
            String cDocente  = (String) cr[3];

            // ── Tareas del alumno en este aula_curso ──────────────────
            String sqlTareas = """
                    SELECT tc.id_tarea,
                           tc.titulo,
                           TO_CHAR(tc.fecha_entrega, 'DD/MM/YYYY') AS fecha,
                           COALESCE(nt.entregado, FALSE) AS entregado,
                           nt.nota,
                           tc.nota_maxima
                    FROM tareas_curso tc
                    LEFT JOIN notas_tarea nt ON nt.id_tarea = tc.id_tarea AND nt.id_alumno = :idAlumno
                    WHERE tc.id_aula_curso = :idAulaCurso
                    ORDER BY tc.fecha_entrega ASC
                    """;

            @SuppressWarnings("unchecked")
            List<Object[]> tareaRows = entityManager.createNativeQuery(sqlTareas)
                    .setParameter("idAlumno",    idAlumno)
                    .setParameter("idAulaCurso", idAulaCurso)
                    .getResultList();

            List<TareaHijoDto> tareas = tareaRows.stream().map(t -> new TareaHijoDto(
                    ((Number)  t[0]).longValue(),
                    (String)   t[1],
                    (String)   t[2],
                    (Boolean)  t[3],
                    t[4] != null ? ((Number) t[4]).doubleValue() : null,
                    ((Number)  t[5]).intValue()
            )).toList();

            // ── Exámenes del alumno en este aula_curso ────────────────
            String sqlExamenes = """
                    SELECT ec.id_examen,
                           ec.titulo,
                           ec.tipo,
                           TO_CHAR(ec.fecha_examen, 'DD/MM/YYYY') AS fecha,
                           COALESCE(ne.asistio, TRUE) AS asistio,
                           ne.nota,
                           ec.nota_maxima
                    FROM examenes_curso ec
                    LEFT JOIN notas_examen ne ON ne.id_examen = ec.id_examen AND ne.id_alumno = :idAlumno
                    WHERE ec.id_aula_curso = :idAulaCurso
                    ORDER BY ec.fecha_examen ASC
                    """;

            @SuppressWarnings("unchecked")
            List<Object[]> examenRows = entityManager.createNativeQuery(sqlExamenes)
                    .setParameter("idAlumno",    idAlumno)
                    .setParameter("idAulaCurso", idAulaCurso)
                    .getResultList();

            List<ExamenHijoDto> examenes = examenRows.stream().map(e -> new ExamenHijoDto(
                    ((Number)  e[0]).longValue(),
                    (String)   e[1],
                    (String)   e[2],
                    (String)   e[3],
                    (Boolean)  e[4],
                    e[5] != null ? ((Number) e[5]).doubleValue() : null,
                    ((Number)  e[6]).intValue()
            )).toList();

            // ── Calcular métricas del curso ───────────────────────────
            int tTotal = tareas.size();
            int tEntregadas = (int) tareas.stream().filter(TareaHijoDto::entregado).count();
            int progreso = tTotal == 0 ? 100 : (tEntregadas * 100) / tTotal;
            double promedio = tareas.stream()
                    .filter(t -> t.nota() != null)
                    .mapToDouble(TareaHijoDto::nota)
                    .average().orElse(0.0);
            promedio = Math.round(promedio * 10.0) / 10.0;

            // Asistencia del curso
            @SuppressWarnings("unchecked")
            List<Object[]> asistRow = entityManager.createNativeQuery("""
                    SELECT COUNT(*) AS total,
                           SUM(CASE WHEN aa.estado IN ('presente','tardanza','justificado') THEN 1 ELSE 0 END) AS pres
                    FROM asistencia_alumno aa
                    WHERE aa.id_aula_curso = :idAulaCurso AND aa.id_alumno = :idAlumno
                    """)
                    .setParameter("idAulaCurso", idAulaCurso)
                    .setParameter("idAlumno",    idAlumno)
                    .getResultList();

            double asistencia = 100.0;
            if (!asistRow.isEmpty()) {
                Object[] ar = asistRow.get(0);
                long total = ((Number) ar[0]).longValue();
                long pres  = ar[1] != null ? ((Number) ar[1]).longValue() : 0L;
                asistencia = total == 0 ? 100.0 : Math.round((pres * 100.0) / total * 10.0) / 10.0;
            }

            resultado.add(new CursoDetalleHijoDto(
                    cNombre, cArea, cDocente,
                    progreso, tEntregadas, tTotal, promedio, asistencia,
                    tareas, examenes
            ));
        }

        return resultado;
    }
}
