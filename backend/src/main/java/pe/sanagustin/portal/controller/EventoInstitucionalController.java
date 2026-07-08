package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.entity.EventoInstitucional;
import pe.sanagustin.portal.repository.EventoInstitucionalRepository;

import java.util.List;

@RestController
@RequestMapping("/api/admin/eventos")
@RequiredArgsConstructor
public class EventoInstitucionalController {

    private final EventoInstitucionalRepository repo;

    @GetMapping
    public List<EventoInstitucional> listar() {
        return repo.findAll();
    }

    @GetMapping("/{id}")
    public ResponseEntity<EventoInstitucional> obtener(@PathVariable Long id) {
        return repo.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    public ResponseEntity<EventoInstitucional> crear(@RequestBody EventoInstitucional evento) {
        evento.setIdEvento(null);
        if (evento.getCreadoPor() == null) {
            evento.setCreadoPor("ADMIN");
        }
        return ResponseEntity.status(HttpStatus.CREATED).body(repo.save(evento));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventoInstitucional> actualizar(@PathVariable Long id, @RequestBody EventoInstitucional detalles) {
        return repo.findById(id)
                .map(ev -> {
                    ev.setTipo(detalles.getTipo());
                    ev.setTitulo(detalles.getTitulo());
                    ev.setFecha(detalles.getFecha());
                    ev.setHoraInicio(detalles.getHoraInicio());
                    ev.setHoraFin(detalles.getHoraFin());
                    ev.setLugar(detalles.getLugar());
                    ev.setDescripcion(detalles.getDescripcion());
                    return ResponseEntity.ok(repo.save(ev));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable Long id) {
        return repo.findById(id)
                .map(ev -> {
                    repo.delete(ev);
                    return ResponseEntity.ok().<Void>build();
                })
                .orElse(ResponseEntity.notFound().build());
    }
}
