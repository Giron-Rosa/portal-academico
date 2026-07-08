package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.sanagustin.portal.dto.NuevaUnidadRequest;
import pe.sanagustin.portal.dto.UnidadDto;

import java.util.Arrays;
import java.util.List;

@Service
public class TemarioService {

    @PersistenceContext
    private EntityManager em;

    public List<UnidadDto> getTemario(Long idAulaCurso) {
        String sql = """
            SELECT id_unidad, id_aula_curso, numero, titulo, bimestre, semanas, objetivos, indicadores, contenidos, estado,
                   TO_CHAR(fecha_conclusion, 'YYYY-MM-DD HH24:MI:SS') AS fecha_conclusion
            FROM unidades_didacticas
            WHERE id_aula_curso = :idAulaCurso
            ORDER BY numero
            """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("idAulaCurso", idAulaCurso)
                .getResultList();

        return rows.stream().map(r -> new UnidadDto(
                ((Number) r[0]).longValue(),
                ((Number) r[1]).longValue(),
                ((Number) r[2]).intValue(),
                (String) r[3],
                (String) r[4],
                (String) r[5],
                castArray(r[6]),
                castArray(r[7]),
                castArray(r[8]),
                (String) r[9],
                (String) r[10]
        )).toList();
    }

    @Transactional
    public void crearUnidad(Long idAulaCurso, NuevaUnidadRequest req) {
        String[] objetivos = req.objetivos().toArray(new String[0]);
        String[] indicadores = req.indicadores().toArray(new String[0]);
        String[] contenidos = req.contenidos().toArray(new String[0]);

        String sql = """
            INSERT INTO unidades_didacticas (id_aula_curso, numero, titulo, bimestre, semanas, objetivos, indicadores, contenidos, estado, fecha_conclusion)
            VALUES (:idAulaCurso, :numero, :titulo, :bimestre, :semanas, :objetivos, :indicadores, :contenidos, :estado, :fechaConclusion)
            """;

        em.createNativeQuery(sql)
                .setParameter("idAulaCurso", idAulaCurso)
                .setParameter("numero", req.numero())
                .setParameter("titulo", req.titulo())
                .setParameter("bimestre", req.bimestre())
                .setParameter("semanas", req.semanas())
                .setParameter("objetivos", objetivos)
                .setParameter("indicadores", indicadores)
                .setParameter("contenidos", contenidos)
                .setParameter("estado", req.estado())
                .setParameter("fechaConclusion", "concluido".equals(req.estado()) ? new java.util.Date() : null)
                .executeUpdate();
    }

    @Transactional
    public void updateUnidad(Long idUnidad, NuevaUnidadRequest req) {
        String[] objetivos = req.objetivos().toArray(new String[0]);
        String[] indicadores = req.indicadores().toArray(new String[0]);
        String[] contenidos = req.contenidos().toArray(new String[0]);

        String sql = """
            UPDATE unidades_didacticas
            SET numero = :numero, titulo = :titulo, bimestre = :bimestre, semanas = :semanas,
                objetivos = :objetivos, indicadores = :indicadores, contenidos = :contenidos,
                estado = :estado,
                fecha_conclusion = :fechaConclusion
            WHERE id_unidad = :idUnidad
            """;

        em.createNativeQuery(sql)
                .setParameter("numero", req.numero())
                .setParameter("titulo", req.titulo())
                .setParameter("bimestre", req.bimestre())
                .setParameter("semanas", req.semanas())
                .setParameter("objetivos", objetivos)
                .setParameter("indicadores", indicadores)
                .setParameter("contenidos", contenidos)
                .setParameter("estado", req.estado())
                .setParameter("fechaConclusion", "concluido".equals(req.estado()) ? new java.util.Date() : null)
                .setParameter("idUnidad", idUnidad)
                .executeUpdate();
    }

    private List<String> castArray(Object obj) {
        if (obj == null) return List.of();
        try {
            if (obj instanceof java.sql.Array) {
                String[] arr = (String[]) ((java.sql.Array) obj).getArray();
                return Arrays.asList(arr);
            } else if (obj instanceof String[]) {
                return Arrays.asList((String[]) obj);
            }
        } catch (Exception e) {
            // ignore
        }
        return List.of();
    }
}
