package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pe.sanagustin.portal.dto.AlumnoPrediccionDto;
import pe.sanagustin.portal.dto.CursoDocenteDto;
import pe.sanagustin.portal.dto.HorarioDocenteDto;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DocenteService {

    private final EntityManager entityManager;

    public List<CursoDocenteDto> getMisCursos(String codigoDocente) {
        String sql = """
                SELECT ac.id_aula_curso,
                       c.nombre,
                       g.nombre        AS grado,
                       s.nombre        AS seccion,
                       ac.horas_semana,
                       a.turno,
                       p.nombre        AS periodo,
                       (SELECT COUNT(*) FROM matriculas m
                        WHERE m.id_aula = a.id_aula AND m.estado = 'activa') AS total_alumnos
                FROM docente_asignaciones da
                JOIN aula_cursos         ac  ON ac.id_aula_curso = da.id_aula_curso
                JOIN cursos              c   ON c.id_curso       = ac.id_curso
                JOIN aulas               a   ON a.id_aula        = ac.id_aula
                JOIN grados              g   ON g.id_grado       = a.id_grado
                JOIN secciones           s   ON s.id_seccion     = a.id_seccion
                JOIN periodos_academicos p   ON p.id_periodo     = a.id_periodo
                JOIN maestros            mae ON mae.id_maestro   = da.id_maestro
                JOIN usuarios            u   ON u.id_usuario     = mae.id_usuario
                WHERE u.codigo = :codigo
                  AND da.activo = true
                ORDER BY g.orden, c.nombre
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager
                .createNativeQuery(sql)
                .setParameter("codigo", codigoDocente)
                .getResultList();

        return rows.stream()
                .map(r -> new CursoDocenteDto(
                        ((Number) r[0]).longValue(),
                        (String)  r[1],
                        (String)  r[2],
                        (String)  r[3],
                        (Integer) r[4],
                        (String)  r[5],
                        (String)  r[6],
                        ((Number) r[7]).longValue()
                ))
                .toList();
    }

    /**
     * Devuelve todos los bloques horarios de la semana del docente identificado
     * por su código de usuario.  Cada bloque incluye el día, la hora y los datos
     * del curso/aula que se dicta en ese slot.
     */
    public List<HorarioDocenteDto> getHorario(String codigoDocente) {

        /* Nombres de los días indexados 1-5 para convertirlos en el mapeo */
        String[] DIAS = { "", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes" };

        String sql = """
                SELECT h.dia_semana,
                       TO_CHAR(h.hora_inicio, 'HH24:MI') AS hora_inicio,
                       TO_CHAR(h.hora_fin,    'HH24:MI') AS hora_fin,
                       c.nombre   AS curso,
                       g.nombre   AS grado,
                       s.nombre   AS seccion,
                       ac.id_aula_curso
                FROM horarios              h
                JOIN aula_cursos           ac  ON ac.id_aula_curso = h.id_aula_curso
                JOIN cursos                c   ON c.id_curso       = ac.id_curso
                JOIN aulas                 a   ON a.id_aula        = ac.id_aula
                JOIN grados                g   ON g.id_grado       = a.id_grado
                JOIN secciones             s   ON s.id_seccion     = a.id_seccion
                JOIN docente_asignaciones  da  ON da.id_aula_curso = ac.id_aula_curso
                                              AND da.activo        = true
                JOIN maestros              mae ON mae.id_maestro   = da.id_maestro
                JOIN usuarios              u   ON u.id_usuario     = mae.id_usuario
                WHERE u.codigo = :codigo
                ORDER BY h.dia_semana, h.hora_inicio
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager
                .createNativeQuery(sql)
                .setParameter("codigo", codigoDocente)
                .getResultList();

        return rows.stream()
                .map(r -> {
                    int dia = ((Number) r[0]).intValue();
                    return new HorarioDocenteDto(
                            dia,
                            DIAS[dia],      /* convierte número a nombre del día */
                            (String) r[1],  /* hora_inicio "HH:MM"               */
                            (String) r[2],  /* hora_fin    "HH:MM"               */
                            (String) r[3],  /* nombre del curso                  */
                            (String) r[4],  /* nombre del grado                  */
                            (String) r[5],  /* letra de sección                  */
                            r[6] != null ? ((Number) r[6]).longValue() : null
                    );
                })
                .toList();
    }

    /**
     * Dashboard de Predicciones / Alertas Tempranas de deserción escolar.
     * Devuelve un consolidado de asistencia y calificaciones de TODOS los alumnos
     * matriculados en las aulas que dicta el docente autenticado.
     * La lógica de clasificación de riesgo (semáforo) se calcula en el frontend
     * para poder ajustar los umbrales de forma dinámica.
     */
    public List<AlumnoPrediccionDto> getPredicciones(String codigoDocente) {
        String sql = """
                SELECT al.id_alumno,
                       al.nombre,
                       al.apellido,
                       ac.id_aula_curso,
                       c.nombre                                         AS curso,
                       g.nombre                                         AS grado,
                       s.nombre                                         AS seccion,
                       COUNT(aa.id_asistencia)                          AS total_clases,
                       COUNT(aa.id_asistencia) FILTER (
                           WHERE aa.estado IN ('presente','tardanza','justificado')
                       )                                                AS clases_presente,
                       COALESCE(
                           ROUND(AVG(nt.nota)::numeric, 1), 0
                       )                                                AS promedio
                FROM docente_asignaciones da
                JOIN aula_cursos          ac  ON ac.id_aula_curso = da.id_aula_curso
                JOIN cursos               c   ON c.id_curso       = ac.id_curso
                JOIN aulas                a   ON a.id_aula        = ac.id_aula
                JOIN grados               g   ON g.id_grado       = a.id_grado
                JOIN secciones            s   ON s.id_seccion     = a.id_seccion
                JOIN matriculas           mat ON mat.id_aula      = a.id_aula
                                             AND mat.estado        = 'activa'
                JOIN alumnos              al  ON al.id_alumno     = mat.id_alumno
                JOIN maestros             mae ON mae.id_maestro   = da.id_maestro
                JOIN usuarios             u   ON u.id_usuario     = mae.id_usuario
                LEFT JOIN asistencia_alumno aa ON aa.id_alumno    = al.id_alumno
                                              AND aa.id_aula_curso = ac.id_aula_curso
                LEFT JOIN notas_tarea      nt  ON nt.id_alumno    = al.id_alumno
                    AND nt.id_tarea IN (
                        SELECT id_tarea FROM tareas_curso
                        WHERE id_aula_curso = ac.id_aula_curso
                    )
                WHERE u.codigo = :codigo AND da.activo = true
                GROUP BY al.id_alumno, al.nombre, al.apellido,
                         ac.id_aula_curso, c.nombre, g.nombre, s.nombre
                ORDER BY g.nombre, s.nombre, al.apellido, al.nombre
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = entityManager
                .createNativeQuery(sql)
                .setParameter("codigo", codigoDocente)
                .getResultList();

        return rows.stream().map(r -> new AlumnoPrediccionDto(
                ((Number) r[0]).longValue(),
                (String)  r[1],
                (String)  r[2],
                ((Number) r[3]).longValue(),
                (String)  r[4],
                (String)  r[5],
                (String)  r[6],
                ((Number) r[7]).intValue(),
                ((Number) r[8]).intValue(),
                r[9] != null ? ((Number) r[9]).doubleValue() : 0.0
        )).toList();
    }
}

