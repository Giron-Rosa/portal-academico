package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pe.sanagustin.portal.dto.PendienteDto;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PendienteService {

    private final EntityManager em;

    /**
     * Devuelve tareas y exámenes que tienen alumnos pendientes de calificación.
     * Tarea pendiente   = entregado = true AND nota IS NULL
     * Examen pendiente  = asistio   = true AND nota IS NULL
     */
    public List<PendienteDto> getPendientes(String codigoDocente) {
        List<PendienteDto> result = new ArrayList<>();
        result.addAll(getPendientesTareas(codigoDocente));
        result.addAll(getPendientesExamenes(codigoDocente));
        return result;
    }

    // ────────────────────────────────────────────────────────
    private List<PendienteDto> getPendientesTareas(String codigo) {
        String sql = """
                SELECT ac.id_aula_curso,
                       'tarea'                              AS tipo,
                       g.nombre                             AS grado,
                       s.nombre                             AS seccion,
                       c.nombre                             AS curso,
                       t.titulo,
                       COUNT(nt.id_nota_tarea)
                           FILTER (WHERE nt.entregado = true AND nt.nota IS NULL)
                                                            AS sin_calificar,
                       COUNT(nt.id_nota_tarea)              AS total_alumnos
                FROM tareas_curso t
                JOIN aula_cursos          ac ON ac.id_aula_curso = t.id_aula_curso
                JOIN aulas                a  ON a.id_aula        = ac.id_aula
                JOIN grados               g  ON g.id_grado       = a.id_grado
                JOIN secciones            s  ON s.id_seccion     = a.id_seccion
                JOIN cursos               c  ON c.id_curso       = ac.id_curso
                JOIN docente_asignaciones da ON da.id_aula_curso = ac.id_aula_curso
                JOIN maestros             m  ON m.id_maestro     = da.id_maestro
                JOIN usuarios             u  ON u.id_usuario     = m.id_usuario
                JOIN notas_tarea          nt ON nt.id_tarea       = t.id_tarea
                WHERE u.codigo = :codigo AND da.activo = true
                GROUP BY ac.id_aula_curso, g.nombre, s.nombre,
                         c.nombre, t.id_tarea, t.titulo
                HAVING COUNT(nt.id_nota_tarea)
                       FILTER (WHERE nt.entregado = true AND nt.nota IS NULL) > 0
                ORDER BY g.nombre, s.nombre, t.titulo
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("codigo", codigo)
                .getResultList();

        return rows.stream().map(r -> new PendienteDto(
                ((Number) r[0]).longValue(),
                (String)  r[1],
                (String)  r[2],
                (String)  r[3],
                (String)  r[4],
                (String)  r[5],
                ((Number) r[6]).intValue(),
                ((Number) r[7]).intValue()
        )).toList();
    }

    // ────────────────────────────────────────────────────────
    private List<PendienteDto> getPendientesExamenes(String codigo) {
        String sql = """
                SELECT ac.id_aula_curso,
                       'examen'                             AS tipo,
                       g.nombre                             AS grado,
                       s.nombre                             AS seccion,
                       c.nombre                             AS curso,
                       e.titulo,
                       COUNT(ne.id_nota_examen)
                           FILTER (WHERE ne.asistio = true AND ne.nota IS NULL)
                                                            AS sin_calificar,
                       COUNT(ne.id_nota_examen)             AS total_alumnos
                FROM examenes_curso e
                JOIN aula_cursos          ac ON ac.id_aula_curso = e.id_aula_curso
                JOIN aulas                a  ON a.id_aula        = ac.id_aula
                JOIN grados               g  ON g.id_grado       = a.id_grado
                JOIN secciones            s  ON s.id_seccion     = a.id_seccion
                JOIN cursos               c  ON c.id_curso       = ac.id_curso
                JOIN docente_asignaciones da ON da.id_aula_curso = ac.id_aula_curso
                JOIN maestros             m  ON m.id_maestro     = da.id_maestro
                JOIN usuarios             u  ON u.id_usuario     = m.id_usuario
                JOIN notas_examen         ne ON ne.id_examen      = e.id_examen
                WHERE u.codigo = :codigo AND da.activo = true
                GROUP BY ac.id_aula_curso, g.nombre, s.nombre,
                         c.nombre, e.id_examen, e.titulo
                HAVING COUNT(ne.id_nota_examen)
                       FILTER (WHERE ne.asistio = true AND ne.nota IS NULL) > 0
                ORDER BY g.nombre, s.nombre, e.titulo
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("codigo", codigo)
                .getResultList();

        return rows.stream().map(r -> new PendienteDto(
                ((Number) r[0]).longValue(),
                (String)  r[1],
                (String)  r[2],
                (String)  r[3],
                (String)  r[4],
                (String)  r[5],
                ((Number) r[6]).intValue(),
                ((Number) r[7]).intValue()
        )).toList();
    }
}
