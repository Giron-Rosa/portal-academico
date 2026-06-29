package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.sanagustin.portal.dto.*;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CajaService {

    @PersistenceContext
    private EntityManager em;

    // ── Categorías ────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public List<CategoriaCajaDto> getCategorias(String tipo) {
        String sql = "SELECT id_categoria, nombre, tipo, descripcion, activo " +
                     "FROM categorias_caja WHERE activo = true" +
                     (tipo != null && !tipo.isBlank() ? " AND tipo = :tipo" : "") +
                     " ORDER BY tipo, nombre";
        var q = em.createNativeQuery(sql);
        if (tipo != null && !tipo.isBlank()) q.setParameter("tipo", tipo);
        List<Object[]> rows = q.getResultList();
        return rows.stream().map(r -> new CategoriaCajaDto(
                ((Number) r[0]).longValue(),
                (String) r[1],
                (String) r[2],
                (String) r[3],
                (Boolean) r[4]
        )).toList();
    }

    // ── Movimientos de Caja ───────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public List<MovimientoCajaDto> getMovimientos(String tipo, Integer anio, Integer mes) {
        StringBuilder sql = new StringBuilder(
            "SELECT m.id_movimiento, m.tipo, m.id_categoria, c.nombre, m.descripcion, " +
            "m.monto, m.fecha::text, m.referencia " +
            "FROM movimientos_caja m " +
            "LEFT JOIN categorias_caja c ON c.id_categoria = m.id_categoria " +
            "WHERE 1=1 "
        );
        if (tipo != null && !tipo.isBlank())  sql.append("AND m.tipo = :tipo ");
        if (anio != null)                     sql.append("AND EXTRACT(YEAR  FROM m.fecha) = :anio ");
        if (mes  != null)                     sql.append("AND EXTRACT(MONTH FROM m.fecha) = :mes  ");
        sql.append("ORDER BY m.fecha DESC");

        var q = em.createNativeQuery(sql.toString());
        if (tipo != null && !tipo.isBlank()) q.setParameter("tipo", tipo);
        if (anio != null) q.setParameter("anio", anio);
        if (mes  != null) q.setParameter("mes",  mes);

        List<Object[]> rows = q.getResultList();
        return rows.stream().map(r -> new MovimientoCajaDto(
                ((Number) r[0]).longValue(),
                (String) r[1],
                r[2] != null ? ((Number) r[2]).longValue() : null,
                (String) r[3],
                (String) r[4],
                (BigDecimal) r[5],
                (String) r[6],
                (String) r[7]
        )).toList();
    }

    @Transactional
    public MovimientoCajaDto registrarMovimiento(NuevoMovimientoRequest req) {
        String sql = "INSERT INTO movimientos_caja (tipo, id_categoria, descripcion, monto, fecha, referencia) " +
                     "VALUES (:tipo, :idCat, :desc, :monto, :fecha::date, :ref) " +
                     "RETURNING id_movimiento";
        var q = em.createNativeQuery(sql);
        q.setParameter("tipo",  req.tipo());
        q.setParameter("idCat", req.idCategoria());
        q.setParameter("desc",  req.descripcion());
        q.setParameter("monto", req.monto());
        q.setParameter("fecha", req.fecha());
        q.setParameter("ref",   req.referencia());
        Number id = (Number) q.getSingleResult();

        return getMovimientos(null, null, null).stream()
                .filter(m -> m.idMovimiento().equals(id.longValue()))
                .findFirst().orElseThrow();
    }

    @Transactional
    public void eliminarMovimiento(long id) {
        em.createNativeQuery("DELETE FROM movimientos_caja WHERE id_movimiento = :id")
          .setParameter("id", id).executeUpdate();
    }

    // ── Flujo de Caja Mensual ─────────────────────────────────────────

    @SuppressWarnings("unchecked")
    public List<FlujoCajaMensualDto> getFlujoCajaMensual(int anio) {
        String sql =
            "SELECT EXTRACT(YEAR FROM fecha)::int  AS anio, " +
            "       EXTRACT(MONTH FROM fecha)::int AS mes, " +
            "       COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END),0) AS total_ingresos, " +
            "       COALESCE(SUM(CASE WHEN tipo='gasto'   THEN monto ELSE 0 END),0) AS total_gastos, " +
            "       COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE -monto END),0) AS saldo " +
            "FROM movimientos_caja " +
            "WHERE EXTRACT(YEAR FROM fecha) = :anio " +
            "GROUP BY anio, mes ORDER BY mes";

        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("anio", anio)
                .getResultList();

        return rows.stream().map(r -> new FlujoCajaMensualDto(
                ((Number) r[0]).intValue(),
                ((Number) r[1]).intValue(),
                (BigDecimal) r[2],
                (BigDecimal) r[3],
                (BigDecimal) r[4]
        )).toList();
    }

    // ── KPI de caja rápido ────────────────────────────────────────────

    public record CajaKpiDto(BigDecimal totalIngresos, BigDecimal totalGastos,
                             BigDecimal saldo, long totalMovimientos) {}

    @SuppressWarnings("unchecked")
    public CajaKpiDto getKpi(int anio) {
        String sql =
            "SELECT COALESCE(SUM(CASE WHEN tipo='ingreso' THEN monto ELSE 0 END),0), " +
            "       COALESCE(SUM(CASE WHEN tipo='gasto'   THEN monto ELSE 0 END),0), " +
            "       COUNT(*) " +
            "FROM movimientos_caja WHERE EXTRACT(YEAR FROM fecha) = :anio";
        Object[] r = (Object[]) em.createNativeQuery(sql).setParameter("anio", anio).getSingleResult();
        BigDecimal ing  = (BigDecimal) r[0];
        BigDecimal gas  = (BigDecimal) r[1];
        long       cnt  = ((Number) r[2]).longValue();
        return new CajaKpiDto(ing, gas, ing.subtract(gas), cnt);
    }
}
