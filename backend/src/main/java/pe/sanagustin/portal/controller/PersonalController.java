package pe.sanagustin.portal.controller;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.entity.Personal;
import pe.sanagustin.portal.repository.PersonalRepository;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/personal")
@RequiredArgsConstructor
public class PersonalController {

    private final PersonalRepository personalRepository;

    @PersistenceContext
    private EntityManager em;

    // ── CRUD PERSONAL ────────────────────────────────────────────────────

    @GetMapping
    public ResponseEntity<List<Personal>> listar() {
        return ResponseEntity.ok(personalRepository.findAll());
    }

    @PostMapping
    public ResponseEntity<Personal> crear(@RequestBody Personal p) {
        p.setIdPersonal(null);
        return ResponseEntity.status(HttpStatus.CREATED).body(personalRepository.save(p));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Personal> actualizar(@PathVariable Long id, @RequestBody Personal detalles) {
        return personalRepository.findById(id)
                .map(p -> {
                    p.setNombre(detalles.getNombre());
                    p.setCargo(detalles.getCargo());
                    p.setTipoContrato(detalles.getTipoContrato());
                    p.setSalarioBase(detalles.getSalarioBase());
                    p.setActivo(detalles.getActivo());
                    return ResponseEntity.ok(personalRepository.save(p));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        return personalRepository.findById(id)
                .map(p -> {
                    p.setActivo(false);
                    personalRepository.save(p);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }

    // ── PAGOS ────────────────────────────────────────────────────────────

    @GetMapping("/{id}/pagos")
    @SuppressWarnings("unchecked")
    public ResponseEntity<List<Object[]>> listarPagos(@PathVariable Long id) {
        List<Object[]> rows = em.createNativeQuery("""
                SELECT pp.id_pago, pp.mes, pp.monto_neto,
                       TO_CHAR(pp.fecha_pago, 'DD/MM/YYYY') AS fecha_pago,
                       pp.nro_recibo
                FROM pagos_personal pp
                WHERE pp.id_personal = :id
                ORDER BY pp.mes DESC
                """).setParameter("id", id).getResultList();
        return ResponseEntity.ok(rows);
    }

    @PostMapping("/{id}/pagos")
    @Transactional
    public ResponseEntity<Void> registrarPago(@PathVariable Long id, @RequestBody Map<String, Object> req) {
        String mes = (String) req.get("mes");
        BigDecimal monto = new BigDecimal(req.get("montoNeto").toString());
        LocalDate fechaPago = LocalDate.now();
        String nroRecibo = (String) req.getOrDefault("nroRecibo", "");

        em.createNativeQuery("""
                INSERT INTO pagos_personal (id_personal, mes, monto_neto, fecha_pago, nro_recibo)
                VALUES (:id, :mes, :monto, :fecha, :recibo)
                ON CONFLICT (id_personal, mes) DO UPDATE
                   SET monto_neto = :monto, fecha_pago = :fecha, nro_recibo = :recibo
                """)
                .setParameter("id", id)
                .setParameter("mes", mes)
                .setParameter("monto", monto)
                .setParameter("fecha", fechaPago)
                .setParameter("recibo", nroRecibo)
                .executeUpdate();

        // También registrar como gasto en movimientos_caja si existe
        try {
            em.createNativeQuery("""
                    INSERT INTO movimientos_caja (concepto, monto, tipo, categoria, fecha)
                    SELECT :concepto, :monto, 'gasto', 'personal', :fecha
                    WHERE EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'movimientos_caja')
                    """)
                    .setParameter("concepto", "Salario " + mes)
                    .setParameter("monto", monto)
                    .setParameter("fecha", fechaPago)
                    .executeUpdate();
        } catch (Exception ignored) {}

        return ResponseEntity.ok().build();
    }
}
