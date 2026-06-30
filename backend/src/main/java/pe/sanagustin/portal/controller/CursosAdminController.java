package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.CrearAsignacionRequest;
import pe.sanagustin.portal.dto.CursoAsignacionDto;
import pe.sanagustin.portal.service.CursoAsignacionService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/cursos")
@RequiredArgsConstructor
public class CursosAdminController {

    private final CursoAsignacionService cursoAsignacionService;

    @GetMapping("/asignaciones")
    public ResponseEntity<List<CursoAsignacionDto>> getAsignaciones() {
        return ResponseEntity.ok(cursoAsignacionService.getAsignaciones());
    }

    @PostMapping("/asignaciones")
    public ResponseEntity<Void> crearAsignacion(@RequestBody CrearAsignacionRequest req) {
        cursoAsignacionService.crearAsignacion(req);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/asignaciones/{id}")
    public ResponseEntity<Void> actualizarAsignacion(
            @PathVariable Long id,
            @RequestBody CrearAsignacionRequest req) {
        cursoAsignacionService.actualizarAsignacion(id, req);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/asignaciones/{id}")
    public ResponseEntity<Void> eliminarAsignacion(@PathVariable Long id) {
        cursoAsignacionService.eliminarAsignacion(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/auxiliares/aulas")
    public ResponseEntity<List<Map<String, Object>>> getAulas() {
        List<Object[]> rows = cursoAsignacionService.getAulasDisponibles();
        List<Map<String, Object>> result = rows.stream().map(r -> Map.<String, Object>of(
                "idAula", ((Number) r[0]).longValue(),
                "grado", r[1],
                "seccion", r[2],
                "periodo", r[3]
        )).toList();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/auxiliares/maestros")
    public ResponseEntity<List<Map<String, Object>>> getMaestros() {
        List<Object[]> rows = cursoAsignacionService.getMaestrosDisponibles();
        List<Map<String, Object>> result = rows.stream().map(r -> Map.<String, Object>of(
                "idMaestro", ((Number) r[0]).longValue(),
                "nombreCompleto", r[1] + " " + r[2]
        )).toList();
        return ResponseEntity.ok(result);
    }
}
