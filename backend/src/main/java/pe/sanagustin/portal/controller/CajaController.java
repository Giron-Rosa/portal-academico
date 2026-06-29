package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.*;
import pe.sanagustin.portal.service.CajaService;

import java.util.List;

@RestController
@RequestMapping("/api/portal/admin/caja")
@RequiredArgsConstructor
public class CajaController {

    private final CajaService cajaService;

    // ── Categorías ─────────────────────────────────────────────────────

    @GetMapping("/categorias")
    public ResponseEntity<List<CategoriaCajaDto>> getCategorias(
            @RequestParam(required = false) String tipo) {
        return ResponseEntity.ok(cajaService.getCategorias(tipo));
    }

    // ── Movimientos ────────────────────────────────────────────────────

    @GetMapping("/movimientos")
    public ResponseEntity<List<MovimientoCajaDto>> getMovimientos(
            @RequestParam(required = false) String tipo,
            @RequestParam(required = false) Integer anio,
            @RequestParam(required = false) Integer mes) {
        return ResponseEntity.ok(cajaService.getMovimientos(tipo, anio, mes));
    }

    @PostMapping("/movimientos")
    public ResponseEntity<MovimientoCajaDto> registrarMovimiento(
            @RequestBody NuevoMovimientoRequest req) {
        return ResponseEntity.ok(cajaService.registrarMovimiento(req));
    }

    @DeleteMapping("/movimientos/{id}")
    public ResponseEntity<Void> eliminarMovimiento(@PathVariable long id) {
        cajaService.eliminarMovimiento(id);
        return ResponseEntity.noContent().build();
    }

    // ── Flujo de Caja Mensual ──────────────────────────────────────────

    @GetMapping("/flujo")
    public ResponseEntity<List<FlujoCajaMensualDto>> getFlujoCaja(
            @RequestParam(defaultValue = "2026") int anio) {
        return ResponseEntity.ok(cajaService.getFlujoCajaMensual(anio));
    }

    // ── KPI Rápido ─────────────────────────────────────────────────────

    @GetMapping("/kpi")
    public ResponseEntity<CajaService.CajaKpiDto> getKpi(
            @RequestParam(defaultValue = "2026") int anio) {
        return ResponseEntity.ok(cajaService.getKpi(anio));
    }
}
