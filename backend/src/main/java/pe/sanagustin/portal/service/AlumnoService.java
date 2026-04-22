package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import pe.sanagustin.portal.dto.CursoAlumnoDto;

import java.util.List;

@Service
public class AlumnoService {

    @PersistenceContext
    private EntityManager em;

    public List<CursoAlumnoDto> getMisCursos(String codigo) {
        String sql = """
                SELECT
                    c.nombre        AS nombre,
                    c.area          AS area,
                    ac.horas_semana AS horas_semana,
                    g.nombre        AS grado,
                    s.nombre        AS seccion,
                    a.turno         AS turno,
                    p.nombre        AS periodo,
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
                (String)  r[0],
                (String)  r[1],
                ((Number) r[2]).intValue(),
                (String)  r[3],
                (String)  r[4],
                (String)  r[5],
                (String)  r[6],
                (String)  r[7]
        )).toList();
    }
}
