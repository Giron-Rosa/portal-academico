package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pe.sanagustin.portal.dto.CursoDocenteDto;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DocenteService {

    private final EntityManager entityManager;

    public List<CursoDocenteDto> getMisCursos(String codigoDocente) {
        String sql = """
                SELECT c.nombre,
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
                        (String)  r[0],
                        (String)  r[1],
                        (String)  r[2],
                        (Integer) r[3],
                        (String)  r[4],
                        (String)  r[5],
                        ((Number) r[6]).longValue()
                ))
                .toList();
    }
}
