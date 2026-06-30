package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.sanagustin.portal.service.BiService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/bi")
@RequiredArgsConstructor
public class BiController {

    private final BiService biService;

    @GetMapping("/promedio-grado")
    public ResponseEntity<List<Map<String, Object>>> getPromedioPorGrado() {
        return ResponseEntity.ok(biService.getPromedioPorGrado());
    }

    @GetMapping("/distribucion-notas")
    public ResponseEntity<List<Map<String, Object>>> getDistribucionNotas() {
        return ResponseEntity.ok(biService.getDistribucionNotas());
    }

    @GetMapping("/asistencia-institucional")
    public ResponseEntity<List<Map<String, Object>>> getAsistenciaInstitucional() {
        return ResponseEntity.ok(biService.getAsistenciaInstitucional());
    }

    @GetMapping("/ranking-morosos")
    public ResponseEntity<List<Map<String, Object>>> getRankingMorosos() {
        return ResponseEntity.ok(biService.getRankingMorosos());
    }
}
