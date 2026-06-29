package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.sanagustin.portal.dto.*;

import java.util.List;
import java.util.Map;

@Service
public class ConfiguracionService {

    @PersistenceContext
    private EntityManager em;

    // ── Datos del Colegio ─────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public ColegioConfigDto getColegioConfig() {
        String sql =
            "SELECT id_config, nombre, ruc, direccion, telefono, email, logo_url, " +
            "       ciudad, distrito, nivel, director, mision, vision " +
            "FROM colegio_config LIMIT 1";
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();
        if (rows.isEmpty()) return null;
        Object[] r = rows.get(0);
        return new ColegioConfigDto(
                ((Number) r[0]).longValue(),
                (String) r[1], (String) r[2], (String) r[3], (String) r[4],
                (String) r[5], (String) r[6], (String) r[7], (String) r[8],
                (String) r[9], (String) r[10], (String) r[11], (String) r[12]
        );
    }

    @Transactional
    public ColegioConfigDto actualizarColegioConfig(Map<String, Object> body) {
        Object[] existing = (Object[]) em.createNativeQuery(
            "SELECT id_config FROM colegio_config LIMIT 1"
        ).getSingleResult();
        long id = ((Number) existing[0]).longValue();

        em.createNativeQuery(
            "UPDATE colegio_config SET nombre=:nombre, ruc=:ruc, direccion=:dir, " +
            "telefono=:tel, email=:email, ciudad=:ciudad, distrito=:dist, nivel=:nivel, " +
            "director=:dir2, mision=:mision, vision=:vision, actualizado_en=now() " +
            "WHERE id_config=:id"
        )
        .setParameter("nombre",   body.get("nombre"))
        .setParameter("ruc",      body.get("ruc"))
        .setParameter("dir",      body.get("direccion"))
        .setParameter("tel",      body.get("telefono"))
        .setParameter("email",    body.get("email"))
        .setParameter("ciudad",   body.get("ciudad"))
        .setParameter("dist",     body.get("distrito"))
        .setParameter("nivel",    body.get("nivel"))
        .setParameter("dir2",     body.get("director"))
        .setParameter("mision",   body.get("mision"))
        .setParameter("vision",   body.get("vision"))
        .setParameter("id",       id)
        .executeUpdate();

        return getColegioConfig();
    }

    // ── Años Escolares ────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public List<AnoEscolarDto> getAnosEscolares() {
        String sql =
            "SELECT id_ano, nombre, fecha_inicio::text, fecha_fin::text, activo " +
            "FROM anos_escolares ORDER BY fecha_inicio DESC";
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();
        return rows.stream().map(r -> new AnoEscolarDto(
                ((Number) r[0]).longValue(),
                (String) r[1], (String) r[2], (String) r[3], (Boolean) r[4]
        )).toList();
    }

    @Transactional
    public void setAnoActivo(long id) {
        em.createNativeQuery("UPDATE anos_escolares SET activo = false").executeUpdate();
        em.createNativeQuery("UPDATE anos_escolares SET activo = true WHERE id_ano = :id")
          .setParameter("id", id).executeUpdate();
    }

    @Transactional
    public AnoEscolarDto crearAnoEscolar(Map<String, Object> body) {
        Object[] r = (Object[]) em.createNativeQuery(
            "INSERT INTO anos_escolares (nombre, fecha_inicio, fecha_fin, activo) " +
            "VALUES (:nombre, :inicio::date, :fin::date, false) RETURNING id_ano, nombre, fecha_inicio::text, fecha_fin::text, activo"
        )
        .setParameter("nombre",  body.get("nombre"))
        .setParameter("inicio",  body.get("fechaInicio"))
        .setParameter("fin",     body.get("fechaFin"))
        .getSingleResult();
        return new AnoEscolarDto(((Number) r[0]).longValue(), (String) r[1], (String) r[2], (String) r[3], (Boolean) r[4]);
    }

    // ── Permisos por Rol ──────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public List<PermisoRolDto> getPermisos() {
        String sql =
            "SELECT p.id_permiso, r.id_rol, r.nombre, m.id_modulo, m.nombre, " +
            "       p.puede_ver, p.puede_crear, p.puede_editar, p.puede_borrar " +
            "FROM permisos_rol_modulo p " +
            "JOIN roles_sistema r ON r.id_rol = p.id_rol " +
            "JOIN modulos_sistema m ON m.id_modulo = p.id_modulo " +
            "ORDER BY r.nombre, m.nombre";
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();
        return rows.stream().map(r -> new PermisoRolDto(
                ((Number) r[0]).longValue(), ((Number) r[1]).longValue(),
                (String) r[2], ((Number) r[3]).longValue(), (String) r[4],
                (Boolean) r[5], (Boolean) r[6], (Boolean) r[7], (Boolean) r[8]
        )).toList();
    }

    @Transactional
    public PermisoRolDto actualizarPermiso(long id, Map<String, Object> body) {
        em.createNativeQuery(
            "UPDATE permisos_rol_modulo SET puede_ver=:ver, puede_crear=:crear, " +
            "puede_editar=:editar, puede_borrar=:borrar WHERE id_permiso=:id"
        )
        .setParameter("ver",    body.get("puedeVer"))
        .setParameter("crear",  body.get("puedeCrear"))
        .setParameter("editar", body.get("puedeEditar"))
        .setParameter("borrar", body.get("puedeBorrar"))
        .setParameter("id",     id)
        .executeUpdate();
        return getPermisos().stream().filter(p -> p.idPermiso() == id).findFirst().orElseThrow();
    }
}
