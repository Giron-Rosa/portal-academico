package pe.sanagustin.portal.scheduler;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class AnalisisRiesgoScheduler {

    private final EntityManager em;

    // Ejecución diaria a la medianoche
    @Scheduled(cron = "0 0 0 * * ?")
    @Transactional
    public void ejecutarAnalisisDiario() {
        log.info("Iniciando tarea programada: Análisis automático de riesgo y recomendaciones...");
        ejecutarAnalisis();
    }

    @Transactional
    public void ejecutarAnalisis() {
        // 1. Obtener todas las aula_cursos activas
        String sqlAulas = "SELECT ac.id_aula_curso, ac.id_aula, da.id_maestro FROM aula_cursos ac LEFT JOIN docente_asignaciones da ON da.id_aula_curso = ac.id_aula_curso AND da.activo = true";
        @SuppressWarnings("unchecked")
        List<Object[]> aulaCursos = em.createNativeQuery(sqlAulas).getResultList();

        for (Object[] ac : aulaCursos) {
            Long idAulaCurso = ((Number) ac[0]).longValue();
            Long idAula = ((Number) ac[1]).longValue();
            Long idMaestro = ac[2] != null ? ((Number) ac[2]).longValue() : 1L; // Maestro 1 (Oscar) por defecto

            // --- REGLA 1: ALERTA DE RENDIMIENTO DE SALÓN ---
            try {
                // Obtener las 2 tareas más recientes de este curso
                String sqlTareas = "SELECT id_tarea FROM tareas_curso WHERE id_aula_curso = :idAulaCurso ORDER BY fecha_entrega DESC, id_tarea DESC LIMIT 2";
                @SuppressWarnings("unchecked")
                List<Number> tareas = em.createNativeQuery(sqlTareas)
                        .setParameter("idAulaCurso", idAulaCurso)
                        .getResultList();

                if (tareas.size() == 2) {
                    Long idTareaReciente = tareas.get(0).longValue();
                    Long idTareaAnterior = tareas.get(1).longValue();

                    Double avgReciente = getPromedioTarea(idTareaReciente);
                    Double avgAnterior = getPromedioTarea(idTareaAnterior);

                    if (avgReciente != null && avgAnterior != null) {
                        if (avgReciente < (avgAnterior - 2.0)) {
                            // Crear recomendación
                            double diferencia = BigDecimal.valueOf(avgAnterior - avgReciente).setScale(1, RoundingMode.HALF_UP).doubleValue();
                            insertarComunicadoRecomendacion(idMaestro, idAula, 
                                    "Recomendación IA: Rendimiento bajo en la última evaluación", 
                                    "El promedio del salón bajó " + diferencia + " puntos en la última tarea (Promedio actual: " + avgReciente + " vs anterior: " + avgAnterior + "). Se sugiere habilitar el módulo de refuerzo.");
                        } else if (avgReciente > (avgAnterior + 1.5)) {
                            // Tendencia positiva
                            double incremento = BigDecimal.valueOf(avgReciente - avgAnterior).setScale(1, RoundingMode.HALF_UP).doubleValue();
                            insertarComunicadoRecomendacion(idMaestro, idAula, 
                                    "Recomendación IA: Excelente tendencia positiva", 
                                    "El promedio general subió " + incremento + " puntos en la última tarea (Promedio actual: " + avgReciente + " vs anterior: " + avgAnterior + "). ¡Excelente trabajo!");
                        }
                    }
                }
            } catch (Exception ex) {
                log.error("Error al calcular alerta de rendimiento para aula_curso {}", idAulaCurso, ex);
            }

            // --- REGLA 2: CORRELACIÓN ASISTENCIA-NOTAS POR ALUMNO ---
            try {
                String sqlAlumnos = "SELECT m.id_alumno FROM matriculas m WHERE m.id_aula = :idAula AND m.estado = 'activa'";
                @SuppressWarnings("unchecked")
                List<Number> alumnos = em.createNativeQuery(sqlAlumnos)
                        .setParameter("idAula", idAula)
                        .getResultList();

                for (Number nAlu : alumnos) {
                    Long idAlumno = nAlu.longValue();

                    // Asistencia
                    String sqlAsist = "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE estado IN ('presente','tardanza','justificado')) AS pres FROM asistencia_alumno WHERE id_alumno = :idAlumno AND id_aula_curso = :idAulaCurso";
                    Object[] asistRow = (Object[]) em.createNativeQuery(sqlAsist)
                            .setParameter("idAlumno", idAlumno)
                            .setParameter("idAulaCurso", idAulaCurso)
                            .getSingleResult();
                    long aTotal = ((Number) asistRow[0]).longValue();
                    long aPres = ((Number) asistRow[1]).longValue();
                    double asistPct = aTotal == 0 ? 100.0 : (aPres * 100.0) / aTotal;

                    // Promedio
                    String sqlProm = "SELECT AVG(nota) FROM notas_tarea nt JOIN tareas_curso tc ON tc.id_tarea = nt.id_tarea WHERE nt.id_alumno = :idAlumno AND tc.id_aula_curso = :idAulaCurso AND nt.entregado = true AND nt.nota IS NOT NULL";
                    Double promedio = null;
                    Object promResult = em.createNativeQuery(sqlProm)
                            .setParameter("idAlumno", idAlumno)
                            .setParameter("idAulaCurso", idAulaCurso)
                            .getSingleResult();
                    if (promResult != null) {
                        promedio = ((Number) promResult).doubleValue();
                    }

                    if (promedio != null && promedio < 11.0 && asistPct < 80.0) {
                        // Crear alerta de correlación en reportes_alumno
                        double asistRound = BigDecimal.valueOf(asistPct).setScale(1, RoundingMode.HALF_UP).doubleValue();
                        double promRound = BigDecimal.valueOf(promedio).setScale(1, RoundingMode.HALF_UP).doubleValue();
                        insertarReporteRiesgo(idAulaCurso, idAlumno, idMaestro, 
                                "Alerta IA: Correlación Crítica de Rendimiento/Inasistencia", 
                                "El estudiante presenta un promedio acumulado desaprobado de " + promRound + " y una asistencia de " + asistRound + "%, colocándose en una zona de riesgo crítico.");
                    }
                }
            } catch (Exception ex) {
                log.error("Error al calcular correlación asistencia-notas para alumnos del aula {}", idAula, ex);
            }
        }
        log.info("Tarea programada de Análisis de Riesgo completada con éxito.");
    }

    private Double getPromedioTarea(Long idTarea) {
        Object res = em.createNativeQuery("SELECT AVG(nota) FROM notas_tarea WHERE id_tarea = :idTarea AND entregado = true AND nota IS NOT NULL")
                .setParameter("idTarea", idTarea)
                .getSingleResult();
        return res != null ? ((Number) res).doubleValue() : null;
    }

    private void insertarComunicadoRecomendacion(Long idMaestro, Long idAula, String titulo, String desc) {
        // Evitar duplicar comunicados del mismo día con el mismo título
        String checkSql = "SELECT COUNT(*) FROM comunicados WHERE id_aula = :idAula AND titulo = :titulo AND fecha_creacion::date = CURRENT_DATE";
        long exists = ((Number) em.createNativeQuery(checkSql)
                .setParameter("idAula", idAula)
                .setParameter("titulo", titulo)
                .getSingleResult()).longValue();

        if (exists == 0) {
            String insertSql = "INSERT INTO comunicados (id_maestro, id_aula, titulo, descripcion, tipo, fecha_evento) VALUES (:idMaestro, :idAula, :titulo, :desc, 'general', CURRENT_DATE)";
            em.createNativeQuery(insertSql)
                    .setParameter("idMaestro", idMaestro)
                    .setParameter("idAula", idAula)
                    .setParameter("titulo", titulo)
                    .setParameter("desc", desc)
                    .executeUpdate();
        }
    }

    private void insertarReporteRiesgo(Long idAulaCurso, Long idAlumno, Long idMaestro, String titulo, String desc) {
        // Evitar duplicar alertas del mismo día
        String checkSql = "SELECT COUNT(*) FROM reportes_alumno WHERE id_alumno = :idAlumno AND id_aula_curso = :idAulaCurso AND titulo = :titulo AND fecha_creacion::date = CURRENT_DATE";
        long exists = ((Number) em.createNativeQuery(checkSql)
                .setParameter("idAlumno", idAlumno)
                .setParameter("idAulaCurso", idAulaCurso)
                .setParameter("titulo", titulo)
                .getSingleResult()).longValue();

        if (exists == 0) {
            String insertSql = "INSERT INTO reportes_alumno (id_aula_curso, id_alumno, id_maestro, tipo, titulo, descripcion, fecha, visible_padre) VALUES (:idAulaCurso, :idAlumno, :idMaestro, 'llamada_atencion', :titulo, :desc, CURRENT_DATE, true)";
            em.createNativeQuery(insertSql)
                    .setParameter("idAulaCurso", idAulaCurso)
                    .setParameter("idAlumno", idAlumno)
                    .setParameter("idMaestro", idMaestro)
                    .setParameter("titulo", titulo)
                    .setParameter("desc", desc)
                    .executeUpdate();
        }
    }
}
