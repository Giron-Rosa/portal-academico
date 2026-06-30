package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.sanagustin.portal.dto.*;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CursoAsignacionService {

    @PersistenceContext
    private EntityManager em;

    @SuppressWarnings("unchecked")
    public List<CursoAsignacionDto> getAsignaciones() {
        String sql = """
                SELECT ac.id_aula_curso,
                       c.id_curso,
                       c.nombre AS curso_nombre,
                       c.area,
                       a.id_aula,
                       g.nombre AS grado_nombre,
                       s.nombre AS seccion_nombre,
                       ac.horas_semana,
                       m.id_maestro,
                       COALESCE(m.nombre || ' ' || m.apellido, 'Sin asignar') AS docente_nombre
                FROM aula_cursos ac
                JOIN cursos c ON c.id_curso = ac.id_curso
                JOIN aulas a ON a.id_aula = ac.id_aula
                JOIN grados g ON g.id_grado = a.id_grado
                JOIN secciones s ON s.id_seccion = a.id_seccion
                LEFT JOIN docente_asignaciones da ON da.id_aula_curso = ac.id_aula_curso AND da.activo = true
                LEFT JOIN maestros m ON m.id_maestro = da.id_maestro
                ORDER BY g.orden, s.nombre, c.nombre
                """;

        List<Object[]> rows = em.createNativeQuery(sql).getResultList();
        return rows.stream().map(r -> new CursoAsignacionDto(
                ((Number) r[0]).longValue(),
                ((Number) r[1]).longValue(),
                (String) r[2],
                (String) r[3],
                ((Number) r[4]).longValue(),
                (String) r[5],
                (String) r[6],
                ((Number) r[7]).intValue(),
                r[8] != null ? ((Number) r[8]).longValue() : null,
                (String) r[9]
        )).toList();
    }

    @Transactional
    public void crearAsignacion(CrearAsignacionRequest req) {
        // 1. Insertar en aula_cursos
        em.createNativeQuery("""
                INSERT INTO aula_cursos (id_aula, id_curso, horas_semana)
                VALUES (:idAula, :idCurso, :horas)
                ON CONFLICT (id_aula, id_curso) DO UPDATE SET horas_semana = :horas
                """)
                .setParameter("idAula", req.idAula())
                .setParameter("idCurso", req.idCurso())
                .setParameter("horas", req.horasSemana())
                .executeUpdate();

        // Obtener el id_aula_curso recién insertado/actualizado
        Number idAulaCurso = (Number) em.createNativeQuery("""
                SELECT id_aula_curso FROM aula_cursos
                WHERE id_aula = :idAula AND id_curso = :idCurso
                """)
                .setParameter("idAula", req.idAula())
                .setParameter("idCurso", req.idCurso())
                .getSingleResult();

        // 2. Si hay maestro asignado, insertar en docente_asignaciones
        if (req.idMaestro() != null) {
            // Desactivar asignaciones previas activas para este aula_curso
            em.createNativeQuery("""
                    UPDATE docente_asignaciones SET activo = false
                    WHERE id_aula_curso = :idAulaCurso
                    """)
                    .setParameter("idAulaCurso", idAulaCurso.longValue())
                    .executeUpdate();

            // Insertar o actualizar
            em.createNativeQuery("""
                    INSERT INTO docente_asignaciones (id_aula_curso, id_maestro, activo)
                    VALUES (:idAulaCurso, :idMaestro, true)
                    ON CONFLICT (id_aula_curso, id_maestro) DO UPDATE SET activo = true
                    """)
                    .setParameter("idAulaCurso", idAulaCurso.longValue())
                    .setParameter("idMaestro", req.idMaestro())
                    .executeUpdate();
        }
    }

    @Transactional
    public void actualizarAsignacion(Long idAulaCurso, CrearAsignacionRequest req) {
        // 1. Actualizar horas en aula_cursos
        em.createNativeQuery("""
                UPDATE aula_cursos SET horas_semana = :horas
                WHERE id_aula_curso = :idAulaCurso
                """)
                .setParameter("horas", req.horasSemana())
                .setParameter("idAulaCurso", idAulaCurso)
                .executeUpdate();

        // 2. Desactivar asignaciones existentes activas
        em.createNativeQuery("""
                UPDATE docente_asignaciones SET activo = false
                WHERE id_aula_curso = :idAulaCurso
                """)
                .setParameter("idAulaCurso", idAulaCurso)
                .executeUpdate();

        // 3. Si se especifica un docente, activarlo o crearlo
        if (req.idMaestro() != null) {
            em.createNativeQuery("""
                    INSERT INTO docente_asignaciones (id_aula_curso, id_maestro, activo)
                    VALUES (:idAulaCurso, :idMaestro, true)
                    ON CONFLICT (id_aula_curso, id_maestro) DO UPDATE SET activo = true
                    """)
                    .setParameter("idAulaCurso", idAulaCurso)
                    .setParameter("idMaestro", req.idMaestro())
                    .executeUpdate();
        }
    }

    @Transactional
    public void eliminarAsignacion(Long idAulaCurso) {
        em.createNativeQuery("DELETE FROM aula_cursos WHERE id_aula_curso = :id")
                .setParameter("id", idAulaCurso)
                .executeUpdate();
    }

    // Métodos auxiliares para los combos del formulario del Admin

    @SuppressWarnings("unchecked")
    public List<Object[]> getAulasDisponibles() {
        return em.createNativeQuery("""
                SELECT a.id_aula, g.nombre, s.nombre, p.nombre
                FROM aulas a
                JOIN grados g ON g.id_grado = a.id_grado
                JOIN secciones s ON s.id_seccion = a.id_seccion
                JOIN periodos_academicos p ON p.id_periodo = a.id_periodo
                WHERE p.activo = true
                ORDER BY g.orden, s.nombre
                """).getResultList();
    }

    @SuppressWarnings("unchecked")
    public List<Object[]> getMaestrosDisponibles() {
        return em.createNativeQuery("""
                SELECT id_maestro, nombre, apellido FROM maestros
                ORDER BY nombre, apellido
                """).getResultList();
    }
}
