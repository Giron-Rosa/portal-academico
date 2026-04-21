package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import pe.sanagustin.portal.dto.CursoHijoDto;
import pe.sanagustin.portal.dto.HijoResumenDto;

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
                       COALESCE(mae.nombre || ' ' || mae.apellido, 'Sin asignar') AS docente
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

            List<CursoHijoDto> cursos = cursoRows.stream()
                    .map(c -> new CursoHijoDto(
                            (String)  c[0],
                            (String)  c[1],
                            (Integer) c[2],
                            (String)  c[3]
                    ))
                    .toList();

            resultado.add(new HijoResumenDto(
                    (String) r[1],
                    (String) r[2],
                    (String) r[3],
                    (String) r[4],
                    (String) r[5],
                    (String) r[6],
                    (String) r[7],
                    (String) r[8],
                    cursos
            ));
        }

        return resultado;
    }
}
