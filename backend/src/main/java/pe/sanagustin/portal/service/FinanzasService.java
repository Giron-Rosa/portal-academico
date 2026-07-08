package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.sanagustin.portal.dto.*;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FinanzasService {

    @PersistenceContext
    private final EntityManager em;

    // ── CRUD de Conceptos de Pago ────────────────────────────────────

    public List<ConceptoPagoDto> getConceptos() {
        String sql = "SELECT id_concepto, nombre, descripcion, monto, activo FROM conceptos_pago ORDER BY id_concepto DESC";
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();
        return rows.stream().map(r -> new ConceptoPagoDto(
                ((Number) r[0]).longValue(),
                (String) r[1],
                (String) r[2],
                (BigDecimal) r[3],
                (Boolean) r[4]
        )).toList();
    }

    @Transactional
    public ConceptoPagoDto crearConcepto(NuevoConceptoRequest req) {
        String sql = """
                INSERT INTO conceptos_pago (nombre, descripcion, monto, activo)
                VALUES (:nombre, :descripcion, :monto, :activo)
                RETURNING id_concepto
                """;
        Number id = (Number) em.createNativeQuery(sql)
                .setParameter("nombre", req.nombre())
                .setParameter("descripcion", req.descripcion())
                .setParameter("monto", req.monto())
                .setParameter("activo", req.activo())
                .getSingleResult();

        return new ConceptoPagoDto(id.longValue(), req.nombre(), req.descripcion(), req.monto(), req.activo());
    }

    @Transactional
    public ConceptoPagoDto actualizarConcepto(long id, NuevoConceptoRequest req) {
        String sql = """
                UPDATE conceptos_pago
                SET nombre = :nombre, descripcion = :descripcion, monto = :monto, activo = :activo
                WHERE id_concepto = :id
                """;
        em.createNativeQuery(sql)
                .setParameter("id", id)
                .setParameter("nombre", req.nombre())
                .setParameter("descripcion", req.descripcion())
                .setParameter("monto", req.monto())
                .setParameter("activo", req.activo())
                .executeUpdate();

        return new ConceptoPagoDto(id, req.nombre(), req.descripcion(), req.monto(), req.activo());
    }

    @Transactional
    public void eliminarConcepto(long id) {
        // Verificar si tiene cuotas asociadas
        String countSql = "SELECT COUNT(1) FROM cuotas_estudiante WHERE id_concepto = :id";
        Number count = (Number) em.createNativeQuery(countSql)
                .setParameter("id", id)
                .getSingleResult();

        if (count.intValue() > 0) {
            // Desactivar concepto si ya tiene cuotas asignadas
            String disableSql = "UPDATE conceptos_pago SET activo = FALSE WHERE id_concepto = :id";
            em.createNativeQuery(disableSql).setParameter("id", id).executeUpdate();
        } else {
            // Eliminar físicamente si está libre
            String deleteSql = "DELETE FROM conceptos_pago WHERE id_concepto = :id";
            em.createNativeQuery(deleteSql).setParameter("id", id).executeUpdate();
        }
    }

    // ── CRUD de Cuotas por Estudiante ─────────────────────────────────

    public List<CuotaEstudianteDto> getCuotas(String query, Boolean pagado) {
        StringBuilder sql = new StringBuilder("""
                SELECT ce.id_cuota,
                       ce.id_estudiante,
                       al.nombre,
                       al.apellido,
                       u.codigo,
                       ce.id_concepto,
                       cp.nombre AS concepto_nombre,
                       cp.monto,
                       ce.fecha_vencimiento,
                       ce.pagado,
                       TO_CHAR(ce.fecha_pago, 'DD/MM/YYYY HH24:MI'),
                       ce.nro_transaccion
                FROM cuotas_estudiante ce
                JOIN alumnos al ON al.id_alumno = ce.id_estudiante
                JOIN usuarios u ON u.id_usuario = al.id_usuario
                JOIN conceptos_pago cp ON cp.id_concepto = ce.id_concepto
                WHERE 1=1
                """);

        if (query != null && !query.trim().isEmpty()) {
            sql.append(" AND (LOWER(al.nombre) LIKE :query OR LOWER(al.apellido) LIKE :query OR LOWER(u.codigo) LIKE :query)");
        }
        if (pagado != null) {
            sql.append(" AND ce.pagado = :pagado");
        }
        sql.append(" ORDER BY ce.id_cuota DESC");

        var q = em.createNativeQuery(sql.toString());
        if (query != null && !query.trim().isEmpty()) {
            q.setParameter("query", "%" + query.toLowerCase().trim() + "%");
        }
        if (pagado != null) {
            q.setParameter("pagado", pagado);
        }

        @SuppressWarnings("unchecked")
        List<Object[]> rows = q.getResultList();

        return rows.stream().map(r -> new CuotaEstudianteDto(
                ((Number) r[0]).longValue(),
                ((Number) r[1]).longValue(),
                (String) r[2],
                (String) r[3],
                (String) r[4],
                ((Number) r[5]).longValue(),
                (String) r[6],
                (BigDecimal) r[7],
                ((Date) r[8]).toLocalDate(),
                (Boolean) r[9],
                (String) r[10],
                (String) r[11]
        )).toList();
    }

    @Transactional
    public void generarCuotas(GenerarCuotasRequest req) {
        String insertSql;
        var q = em.createNativeQuery("");

        if (req.grado() != null && !req.grado().trim().isEmpty()) {
            insertSql = """
                    INSERT INTO cuotas_estudiante (id_estudiante, id_concepto, fecha_vencimiento, pagado)
                    SELECT al.id_alumno, :idConcepto, :fechaVencimiento, FALSE
                    FROM alumnos al
                    WHERE al.grado = :grado
                    ON CONFLICT (id_estudiante, id_concepto) DO NOTHING
                    """;
            q = em.createNativeQuery(insertSql)
                    .setParameter("idConcepto", req.idConcepto())
                    .setParameter("fechaVencimiento", Date.valueOf(req.fechaVencimiento()))
                    .setParameter("grado", req.grado());
        } else {
            insertSql = """
                    INSERT INTO cuotas_estudiante (id_estudiante, id_concepto, fecha_vencimiento, pagado)
                    SELECT al.id_alumno, :idConcepto, :fechaVencimiento, FALSE
                    FROM alumnos al
                    ON CONFLICT (id_estudiante, id_concepto) DO NOTHING
                    """;
            q = em.createNativeQuery(insertSql)
                    .setParameter("idConcepto", req.idConcepto())
                    .setParameter("fechaVencimiento", Date.valueOf(req.fechaVencimiento()));
        }
        q.executeUpdate();
    }

    @Transactional
    public void registrarPagoManual(long idCuota, String nroTransaccion) {
        String sql = """
                UPDATE cuotas_estudiante
                SET pagado = TRUE, fecha_pago = NOW(), nro_transaccion = :nroTransaccion
                WHERE id_cuota = :id
                """;
        em.createNativeQuery(sql)
                .setParameter("id", idCuota)
                .setParameter("nroTransaccion", nroTransaccion != null ? nroTransaccion : "MANUAL-CASH")
                .executeUpdate();
    }
}
