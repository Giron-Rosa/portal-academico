package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.RecursoDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@RestController
@RequestMapping("/api/portal")
@RequiredArgsConstructor
public class RecursoController {

    @PersistenceContext
    private EntityManager em;

    @GetMapping({"/alumno/recursos", "/padre/recursos"})
    public ResponseEntity<List<RecursoDto>> getRecursos() {
        String sql = """
                SELECT id_recurso, nombre, descripcion, url, categoria, tipo
                FROM recursos_biblioteca
                ORDER BY categoria, nombre
                """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();

        List<RecursoDto> dtos = rows.stream().map(r -> new RecursoDto(
                ((Number) r[0]).longValue(),
                (String) r[1],
                (String) r[2],
                (String) r[3],
                (String) r[4],
                (String) r[5]
        )).toList();

        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/admin/recursos")
    @Transactional
    public ResponseEntity<Void> crearRecurso(@RequestBody RecursoDto req) {
        String sql = """
                INSERT INTO recursos_biblioteca (nombre, descripcion, url, categoria, tipo)
                VALUES (:nombre, :descripcion, :url, :categoria, :tipo)
                """;
        em.createNativeQuery(sql)
                .setParameter("nombre", req.nombre())
                .setParameter("descripcion", req.descripcion())
                .setParameter("url", req.url())
                .setParameter("categoria", req.categoria())
                .setParameter("tipo", req.tipo())
                .executeUpdate();

        return ResponseEntity.ok().build();
    }
}
