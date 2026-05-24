package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.entity.Curso;
import pe.sanagustin.portal.repository.CursoRepository;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/cursos")
@RequiredArgsConstructor
public class CursoController {

    private final CursoRepository cursoRepository;

    @GetMapping
    public List<Curso> listarTodos() {
        return cursoRepository.findAll();
    }

    @GetMapping("/activos")
    public List<Curso> listarActivos() {
        return cursoRepository.findByActivoTrue();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Curso> obtenerPorId(@PathVariable Long id) {
        return cursoRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<Curso> crear(@RequestBody Curso curso) {
        curso.setIdCurso(null); // Garantizar que sea una creación
        Curso nuevoCurso = cursoRepository.save(curso);
        return ResponseEntity.status(HttpStatus.CREATED).body(nuevoCurso);
    }

    @PutMapping("/{id}")
    public ResponseEntity<Curso> actualizar(@PathVariable Long id, @RequestBody Curso cursoDetalles) {
        return cursoRepository.findById(id)
                .map(curso -> {
                    curso.setNombre(cursoDetalles.getNombre());
                    curso.setArea(cursoDetalles.getArea());
                    curso.setActivo(cursoDetalles.getActivo());
                    Curso cursoActualizado = cursoRepository.save(curso);
                    return ResponseEntity.ok(cursoActualizado);
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> eliminar(@PathVariable Long id) {
        return cursoRepository.findById(id)
                .map(curso -> {
                    // Eliminación lógica marcando como inactivo
                    curso.setActivo(false);
                    cursoRepository.save(curso);
                    return ResponseEntity.ok(Map.of("mensaje", "Curso desactivado exitosamente"));
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
