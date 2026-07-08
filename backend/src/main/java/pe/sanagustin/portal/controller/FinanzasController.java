package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.*;
import pe.sanagustin.portal.service.FinanzasService;

import java.util.List;

@RestController
@RequestMapping("/api/portal/admin/finanzas")
@RequiredArgsConstructor
public class FinanzasController {

    private final FinanzasService finanzasService;

    // ── CRUD de Conceptos de Pago ────────────────────────────────────

    @GetMapping("/conceptos")
    public ResponseEntity<List<ConceptoPagoDto>> getConceptos() {
        return ResponseEntity.ok(finanzasService.getConceptos());
    }

    @PostMapping("/conceptos")
    public ResponseEntity<ConceptoPagoDto> crearConcepto(@RequestBody NuevoConceptoRequest req) {
        return ResponseEntity.ok(finanzasService.crearConcepto(req));
    }

    @PutMapping("/conceptos/{id}")
    public ResponseEntity<ConceptoPagoDto> actualizarConcepto(
            @PathVariable long id,
            @RequestBody NuevoConceptoRequest req) {
        return ResponseEntity.ok(finanzasService.actualizarConcepto(id, req));
    }

    @DeleteMapping("/conceptos/{id}")
    public ResponseEntity<Void> eliminarConcepto(@PathVariable long id) {
        finanzasService.eliminarConcepto(id);
        return ResponseEntity.noContent().build();
    }

    // ── Gestión de Cuotas por Estudiante ───────────────────────────────

    @GetMapping("/cuotas")
    public ResponseEntity<List<CuotaEstudianteDto>> getCuotas(
            @RequestParam(required = false) String query,
            @RequestParam(required = false) Boolean pagado) {
        return ResponseEntity.ok(finanzasService.getCuotas(query, pagado));
    }

    @PostMapping("/cuotas/generar")
    public ResponseEntity<Void> generarCuotas(@RequestBody GenerarCuotasRequest req) {
        finanzasService.generarCuotas(req);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/cuotas/{id}/pagar")
    public ResponseEntity<Void> registrarPagoManual(
            @PathVariable long id,
            @RequestBody(required = false) PagarCuotaRequest req) {
        String tx = (req != null) ? req.nroTransaccion() : "MANUAL-CASH";
        finanzasService.registrarPagoManual(id, tx);
        return ResponseEntity.ok().build();
    }
}
