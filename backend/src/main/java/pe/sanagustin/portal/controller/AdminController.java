package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.*;
import pe.sanagustin.portal.service.AdminService;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final pe.sanagustin.portal.scheduler.AnalisisRiesgoScheduler analisisRiesgoScheduler;

    @PostMapping("/run-risk-analysis")
    public ResponseEntity<Void> runRiskAnalysis() {
        analisisRiesgoScheduler.ejecutarAnalisis();
        return ResponseEntity.ok().build();
    }

    // ── DASHBOARD KPIS ──────────────────────────────────────────────────
    @GetMapping("/dashboard/kpis")
    public ResponseEntity<AdminDashboardKpisDto> getDashboardKpis() {
        return ResponseEntity.ok(adminService.getDashboardKpis());
    }

    // ── CRUD ESTUDIANTES ────────────────────────────────────────────────
    @GetMapping("/estudiantes")
    public ResponseEntity<List<EstudianteAdminDto>> getEstudiantes() {
        return ResponseEntity.ok(adminService.getEstudiantes());
    }

    @PostMapping("/estudiantes")
    public ResponseEntity<EstudianteAdminDto> crearEstudiante(@RequestBody GuardarEstudianteRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.crearEstudiante(req));
    }

    @PutMapping("/estudiantes/{id}")
    public ResponseEntity<EstudianteAdminDto> actualizarEstudiante(@PathVariable Long id, @RequestBody GuardarEstudianteRequest req) {
        return ResponseEntity.ok(adminService.actualizarEstudiante(id, req));
    }

    @DeleteMapping("/estudiantes/{id}")
    public ResponseEntity<Void> eliminarEstudiante(@PathVariable Long id) {
        adminService.eliminarEstudiante(id);
        return ResponseEntity.noContent().build();
    }

    // ── CRUD DOCENTES ──────────────────────────────────────────────────
    @GetMapping("/docentes")
    public ResponseEntity<List<DocenteAdminDto>> getDocentes() {
        return ResponseEntity.ok(adminService.getDocentes());
    }

    @PostMapping("/docentes")
    public ResponseEntity<DocenteAdminDto> crearDocente(@RequestBody GuardarDocenteRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.crearDocente(req));
    }

    @PutMapping("/docentes/{id}")
    public ResponseEntity<DocenteAdminDto> actualizarDocente(@PathVariable Long id, @RequestBody GuardarDocenteRequest req) {
        return ResponseEntity.ok(adminService.actualizarDocente(id, req));
    }

    @DeleteMapping("/docentes/{id}")
    public ResponseEntity<Void> eliminarDocente(@PathVariable Long id) {
        adminService.eliminarDocente(id);
        return ResponseEntity.noContent().build();
    }

    // ── CRUD PADRES ────────────────────────────────────────────────────
    @GetMapping("/padres")
    public ResponseEntity<List<PadreAdminDto>> getPadres() {
        return ResponseEntity.ok(adminService.getPadres());
    }

    @PostMapping("/padres")
    public ResponseEntity<PadreAdminDto> crearPadre(@RequestBody GuardarPadreRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.crearPadre(req));
    }

    @PutMapping("/padres/{id}")
    public ResponseEntity<PadreAdminDto> actualizarPadre(@PathVariable Long id, @RequestBody GuardarPadreRequest req) {
        return ResponseEntity.ok(adminService.actualizarPadre(id, req));
    }

    @DeleteMapping("/padres/{id}")
    public ResponseEntity<Void> eliminarPadre(@PathVariable Long id) {
        adminService.eliminarPadre(id);
        return ResponseEntity.noContent().build();
    }

    // ── CRUD KANBAN NOTES ──────────────────────────────────────────────
    @GetMapping("/notas-kanban")
    public ResponseEntity<List<NotaKanbanDto>> getNotasKanban() {
        return ResponseEntity.ok(adminService.getNotasKanban());
    }

    @PostMapping("/notas-kanban")
    public ResponseEntity<NotaKanbanDto> crearNotaKanban(@RequestBody NotaKanbanDto req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(adminService.crearNotaKanban(req));
    }

    @PutMapping("/notas-kanban/{id}")
    public ResponseEntity<NotaKanbanDto> actualizarNotaKanban(@PathVariable Long id, @RequestBody NotaKanbanDto req) {
        return ResponseEntity.ok(adminService.actualizarNotaKanban(id, req));
    }

    @DeleteMapping("/notas-kanban/{id}")
    public ResponseEntity<Void> eliminarNotaKanban(@PathVariable Long id) {
        adminService.eliminarNotaKanban(id);
        return ResponseEntity.noContent().build();
    }
}
