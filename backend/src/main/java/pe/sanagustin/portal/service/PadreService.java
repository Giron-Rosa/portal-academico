package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pe.sanagustin.portal.dto.AsistenciaDetalleHijoDto;
import pe.sanagustin.portal.dto.AsistenciaHijoDto;
import pe.sanagustin.portal.dto.CursoDetalleHijoDto;
import pe.sanagustin.portal.dto.CursoHijoDto;
import pe.sanagustin.portal.dto.ExamenHijoDto;
import pe.sanagustin.portal.dto.EventoHijoDto;
import pe.sanagustin.portal.dto.PagoHijoDto;
import pe.sanagustin.portal.dto.HijoResumenDto;
import pe.sanagustin.portal.dto.HorarioDocenteDto;
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

            int cuotasPendientes = ((Number) entityManager.createNativeQuery("""
                    SELECT COUNT(*)
                    FROM cuotas_estudiante
                    WHERE id_estudiante = :idAlumno AND pagado = false
                    """)
                    .setParameter("idAlumno", idAlumno)
                    .getSingleResult()).intValue();

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
                    cuotasPendientes,
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

    /**
     * getAsistenciaDetalle: devuelve el historial completo de asistencia del alumno
     * con métricas generales y de cada curso.
     * Solo permitido si el padre autenticado tiene relación con el alumno.
     */
    public AsistenciaDetalleHijoDto getAsistenciaDetalle(String codigoPadre, String codigoAlumno) {
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

        // Obtener historial de asistencia
        String sqlAsistencia = """
                SELECT TO_CHAR(aa.fecha, 'DD/MM/YYYY') AS fecha_formateada,
                       aa.estado,
                       c.nombre AS curso,
                       aa.justificante
                FROM asistencia_alumno aa
                JOIN aula_cursos ac ON ac.id_aula_curso = aa.id_aula_curso
                JOIN cursos      c  ON c.id_curso       = ac.id_curso
                WHERE aa.id_alumno = :idAlumno
                ORDER BY aa.fecha DESC
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(sqlAsistencia)
                .setParameter("idAlumno", idAlumno)
                .getResultList();

        List<AsistenciaHijoDto> historial = new ArrayList<>();
        int presente = 0;
        int tardanza = 0;
        int falta = 0;
        int justificado = 0;

        for (Object[] r : rows) {
            String fecha = (String) r[0];
            String estado = (String) r[1];
            String curso = (String) r[2];
            String justificante = (String) r[3];

            historial.add(new AsistenciaHijoDto(fecha, estado, curso, justificante));

            if ("presente".equalsIgnoreCase(estado)) {
                presente++;
            } else if ("tardanza".equalsIgnoreCase(estado)) {
                tardanza++;
            } else if ("falta".equalsIgnoreCase(estado) || "falto".equalsIgnoreCase(estado)) {
                falta++;
            } else if ("justificado".equalsIgnoreCase(estado)) {
                justificado++;
            }
        }

        int total = historial.size();
        double porcentaje = total == 0 ? 100.0 : Math.round((presente + tardanza + justificado) * 100.0 / total * 10.0) / 10.0;

        return new AsistenciaDetalleHijoDto(historial, total, presente, tardanza, falta, justificado, porcentaje);
    }

    /**
     * getEventos: devuelve la lista de comunicados y eventos dirigidos al aula de la matrícula activa del alumno.
     * Solo permitido si el padre autenticado tiene relación con el alumno.
     */
    public List<EventoHijoDto> getEventos(String codigoPadre, String codigoAlumno) {
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

        // Obtener comunicados dirigidos al aula del alumno (usando la tabla comunicado_aulas)
        // Un comunicado aplica si:
        //   a) Tiene entradas en comunicado_aulas para el aula del alumno, O
        //   b) No tiene ninguna entrada en comunicado_aulas (comunicado general)
        String sqlEventos = """
                SELECT c.id_comunicado,
                       c.titulo,
                       c.descripcion,
                       c.tipo,
                       TO_CHAR(c.fecha_evento, 'DD/MM/YYYY') AS fecha_evento,
                       COALESCE(TO_CHAR(c.hora_evento, 'HH24:MI'), '') AS hora_evento,
                       TO_CHAR(c.fecha_creacion, 'DD/MM/YYYY HH24:MI') AS fecha_creacion,
                       COALESCE(mae.nombre || ' ' || mae.apellido, 'Docente') AS docente
                FROM matriculas m
                JOIN aulas a ON a.id_aula = m.id_aula
                JOIN comunicados c ON (
                    EXISTS (
                        SELECT 1 FROM comunicado_aulas ca
                        WHERE ca.id_comunicado = c.id_comunicado
                          AND ca.id_aula = a.id_aula
                    )
                    OR NOT EXISTS (
                        SELECT 1 FROM comunicado_aulas ca
                        WHERE ca.id_comunicado = c.id_comunicado
                    )
                )
                LEFT JOIN maestros mae ON mae.id_maestro = c.id_maestro
                WHERE m.id_alumno = :idAlumno AND m.estado = 'activa'
                ORDER BY c.fecha_evento ASC NULLS LAST, c.fecha_creacion DESC
                """;


        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(sqlEventos)
                .setParameter("idAlumno", idAlumno)
                .getResultList();

        List<EventoHijoDto> resultado = new ArrayList<>();
        for (Object[] r : rows) {
            resultado.add(new EventoHijoDto(
                    ((Number) r[0]).longValue(),
                    (String) r[1],
                    (String) r[2],
                    (String) r[3],
                    (String) r[4],
                    (String) r[5],
                    (String) r[6],
                    (String) r[7]
            ));
        }

        return resultado;
    }

    /**
     * getPagos: devuelve la lista de pensiones y pagos del apoderado para su hijo.
     * Solo permitido si el padre autenticado tiene relación con el alumno.
     */
    public List<PagoHijoDto> getPagos(String codigoPadre, String codigoAlumno) {
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

        String sql = """
                SELECT cp.nombre,
                       cp.monto,
                       TO_CHAR(ce.fecha_vencimiento, 'DD/MM/YYYY') AS fecha_venc,
                       CASE
                         WHEN ce.pagado = true THEN 'PAGADO'
                         WHEN ce.fecha_vencimiento < CURRENT_DATE THEN 'VENCIDO'
                         ELSE 'PENDIENTE'
                       END AS estado,
                       TO_CHAR(ce.fecha_pago, 'DD/MM/YYYY') AS fecha_pago,
                       ce.nro_transaccion
                FROM cuotas_estudiante ce
                JOIN conceptos_pago cp ON cp.id_concepto = ce.id_concepto
                WHERE ce.id_estudiante = :idAlumno
                ORDER BY ce.fecha_vencimiento ASC
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(sql)
                .setParameter("idAlumno", idAlumno)
                .getResultList();

        List<PagoHijoDto> list = new ArrayList<>();
        for (Object[] r : rows) {
            list.add(new PagoHijoDto(
                    (String) r[0],
                    ((Number) r[1]).doubleValue(),
                    (String) r[2],
                    (String) r[3],
                    r[4] != null ? (String) r[4] : null,
                    r[5] != null ? (String) r[5] : null
            ));
        }
        return list;
    }

    public List<HorarioDocenteDto> getHorarioHijo(String codigoPadre, String codigoAlumno) {
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

        String[] DIAS = { "", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes" };

        String sql = """
                SELECT h.dia_semana,
                       TO_CHAR(h.hora_inicio, 'HH24:MI') AS hora_inicio,
                       TO_CHAR(h.hora_fin,    'HH24:MI') AS hora_fin,
                       c.nombre   AS curso,
                       g.nombre   AS grado,
                       s.nombre   AS seccion,
                       ac.id_aula_curso
                FROM horarios h
                JOIN aula_cursos ac ON ac.id_aula_curso = h.id_aula_curso
                JOIN cursos      c  ON c.id_curso       = ac.id_curso
                JOIN aulas       a  ON a.id_aula        = ac.id_aula
                JOIN grados      g  ON g.id_grado       = a.id_grado
                JOIN secciones   s  ON s.id_seccion     = a.id_seccion
                JOIN matriculas  m  ON m.id_aula        = a.id_aula
                JOIN alumnos     al ON al.id_alumno     = m.id_alumno
                JOIN usuarios    u  ON u.id_usuario     = al.id_usuario
                WHERE u.codigo = :codAlumno AND m.estado = 'activa'
                ORDER BY h.dia_semana, h.hora_inicio
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager.createNativeQuery(sql)
                .setParameter("codAlumno", codigoAlumno)
                .getResultList();

        List<HorarioDocenteDto> list = new ArrayList<>();
        for (Object[] r : rows) {
            int dia = ((Number) r[0]).intValue();
            list.add(new HorarioDocenteDto(
                    dia,
                    DIAS[dia],
                    (String) r[1],
                    (String) r[2],
                    (String) r[3],
                    (String) r[4],
                    (String) r[5],
                    r[6] != null ? ((Number) r[6]).longValue() : null
            ));
        }
        return list;
    }
}

