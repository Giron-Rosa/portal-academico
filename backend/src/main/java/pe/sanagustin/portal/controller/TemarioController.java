package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.NuevaUnidadRequest;
import pe.sanagustin.portal.dto.UnidadDto;
import pe.sanagustin.portal.service.TemarioService;

import java.util.List;

@RestController
@RequestMapping("/api/portal")
@RequiredArgsConstructor
public class TemarioController {

    private final TemarioService temarioService;

    // ── ENDPOINTS DOCENTE ────────────────────────────────────────────────
    @GetMapping("/docente/cursos/{id}/temario")
    public ResponseEntity<List<UnidadDto>> getTemarioDocente(@PathVariable Long id) {
        return ResponseEntity.ok(temarioService.getTemario(id));
    }

    @PostMapping("/docente/cursos/{id}/temario")
    public ResponseEntity<Void> crearUnidadDocente(@PathVariable Long id, @RequestBody NuevaUnidadRequest req) {
        temarioService.crearUnidad(id, req);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/docente/temario/{idUnidad}")
    public ResponseEntity<Void> updateUnidadDocente(@PathVariable Long idUnidad, @RequestBody NuevaUnidadRequest req) {
        temarioService.updateUnidad(idUnidad, req);
        return ResponseEntity.ok().build();
    }

    // ── ENDPOINTS ALUMNO ─────────────────────────────────────────────────
    @GetMapping("/alumno/cursos/{id}/temario")
    public ResponseEntity<List<UnidadDto>> getTemarioAlumno(@PathVariable Long id) {
        return ResponseEntity.ok(temarioService.getTemario(id));
    }
}
