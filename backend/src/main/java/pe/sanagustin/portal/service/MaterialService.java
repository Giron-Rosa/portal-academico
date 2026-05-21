package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import pe.sanagustin.portal.dto.MaterialDto;
import pe.sanagustin.portal.dto.NuevoMaterialRequest;

import java.math.BigInteger;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MaterialService {

    private final EntityManager em;

    // ────────────────────────────────────────────────────────
    // Listar materiales de un aula_curso
    // ────────────────────────────────────────────────────────
    /**
     * Devuelve todos los materiales del aula_curso indicado,
     * verificando que el docente autenticado sea el responsable.
     * Ordenados por semana ASC, clase ASC, fecha_creacion ASC.
     */
    public List<MaterialDto> getMateriales(long idAulaCurso, String codigoDocente) {
        verificarAutorizacion(idAulaCurso, codigoDocente);

        String sql = """
                SELECT mc.id_material,
                       mc.semana,
                       mc.clase,
                       mc.titulo,
                       mc.tipo,
                       mc.url,
                       TO_CHAR(mc.fecha_creacion, 'DD/MM/YYYY') AS fecha
                FROM materiales_curso mc
                WHERE mc.id_aula_curso = :idAulaCurso
                ORDER BY mc.semana, mc.clase, mc.fecha_creacion
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("idAulaCurso", idAulaCurso)
                .getResultList();

        return rows.stream()
                .map(r -> new MaterialDto(
                        ((Number) r[0]).longValue(),
                        ((Number) r[1]).intValue(),
                        ((Number) r[2]).intValue(),
                        (String)  r[3],
                        (String)  r[4],
                        (String)  r[5],
                        (String)  r[6]
                ))
                .toList();
    }

    // ────────────────────────────────────────────────────────
    // Crear material
    // ────────────────────────────────────────────────────────
    @Transactional
    public MaterialDto crearMaterial(long idAulaCurso,
                                     NuevoMaterialRequest req,
                                     String codigoDocente) {
        verificarAutorizacion(idAulaCurso, codigoDocente);

        String sql = """
                INSERT INTO materiales_curso
                    (id_aula_curso, semana, clase, titulo, tipo, url)
                VALUES (:iac, :semana, :clase, :titulo, :tipo, :url)
                RETURNING id_material
                """;

        Number newId = (Number) em.createNativeQuery(sql)
                .setParameter("iac",    idAulaCurso)
                .setParameter("semana", req.getSemana())
                .setParameter("clase",  req.getClase())
                .setParameter("titulo", req.getTitulo().trim())
                .setParameter("tipo",   req.getTipo())
                .setParameter("url",    req.getUrl())
                .getSingleResult();

        return getMateriales(idAulaCurso, codigoDocente).stream()
                .filter(m -> m.id() == newId.longValue())
                .findFirst()
                .orElseThrow();
    }

    // ────────────────────────────────────────────────────────
    // Eliminar material
    // ────────────────────────────────────────────────────────
    @Transactional
    public void eliminarMaterial(long idMaterial, String codigoDocente) {
        /* Eliminar solo si pertenece a una asignación del docente autenticado */
        String sql = """
                DELETE FROM materiales_curso mc
                WHERE mc.id_material = :id
                  AND mc.id_aula_curso IN (
                      SELECT da.id_aula_curso
                      FROM docente_asignaciones da
                      JOIN maestros m ON m.id_maestro = da.id_maestro
                      JOIN usuarios u ON u.id_usuario = m.id_usuario
                      WHERE u.codigo = :codigo AND da.activo = true
                  )
                """;

        int rows = em.createNativeQuery(sql)
                .setParameter("id",     idMaterial)
                .setParameter("codigo", codigoDocente)
                .executeUpdate();

        if (rows == 0) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Material no encontrado o no autorizado");
        }
    }

    // ────────────────────────────────────────────────────────
    // Helper: verificar que el docente tiene acceso al aula_curso
    // ────────────────────────────────────────────────────────
    private void verificarAutorizacion(long idAulaCurso, String codigoDocente) {
        String sql = """
                SELECT COUNT(*)
                FROM docente_asignaciones da
                JOIN maestros m ON m.id_maestro = da.id_maestro
                JOIN usuarios u ON u.id_usuario = m.id_usuario
                WHERE da.id_aula_curso = :iac
                  AND u.codigo = :codigo
                  AND da.activo = true
                """;

        Number count = (Number) em.createNativeQuery(sql)
                .setParameter("iac",    idAulaCurso)
                .setParameter("codigo", codigoDocente)
                .getSingleResult();

        if (count.longValue() == 0) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "No autorizado para este curso");
        }
    }
}
