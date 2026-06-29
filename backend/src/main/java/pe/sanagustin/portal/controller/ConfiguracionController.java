package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.*;
import pe.sanagustin.portal.service.ConfiguracionService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/portal/admin/config")
@RequiredArgsConstructor
public class ConfiguracionController {

    private final ConfiguracionService configuracionService;

    // ── Datos del Colegio ─────────────────────────────────────────────

    @GetMapping("/colegio")
    public ResponseEntity<ColegioConfigDto> getColegioConfig() {
        return ResponseEntity.ok(configuracionService.getColegioConfig());
    }

    @PutMapping("/colegio")
    public ResponseEntity<ColegioConfigDto> actualizarColegioConfig(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(configuracionService.actualizarColegioConfig(body));
    }

    // ── Años Escolares ────────────────────────────────────────────────

    @GetMapping("/anos")
    public ResponseEntity<List<AnoEscolarDto>> getAnosEscolares() {
        return ResponseEntity.ok(configuracionService.getAnosEscolares());
    }

    @PostMapping("/anos")
    public ResponseEntity<AnoEscolarDto> crearAnoEscolar(@RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(configuracionService.crearAnoEscolar(body));
    }

    @PutMapping("/anos/{id}/activar")
    public ResponseEntity<Void> activarAnoEscolar(@PathVariable long id) {
        configuracionService.setAnoActivo(id);
        return ResponseEntity.ok().build();
    }

    // ── Permisos por Rol ──────────────────────────────────────────────

    @GetMapping("/permisos")
    public ResponseEntity<List<PermisoRolDto>> getPermisos() {
        return ResponseEntity.ok(configuracionService.getPermisos());
    }

    @PutMapping("/permisos/{id}")
    public ResponseEntity<PermisoRolDto> actualizarPermiso(
            @PathVariable long id,
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(configuracionService.actualizarPermiso(id, body));
    }
}
