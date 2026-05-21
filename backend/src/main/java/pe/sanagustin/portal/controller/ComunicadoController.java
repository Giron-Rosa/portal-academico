package pe.sanagustin.portal.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.AulaDto;
import pe.sanagustin.portal.dto.ComunicadoDto;
import pe.sanagustin.portal.dto.NuevoComunicadoRequest;
import pe.sanagustin.portal.service.ComunicadoService;

import java.util.List;
import java.util.Map;

/**
 * Endpoints de comunicados para el portal del docente.
 *
 * GET  /api/portal/docente/comunicados           → lista de comunicados
 * GET  /api/portal/docente/comunicados/mis-aulas → aulas del docente (para el select)
 * POST /api/portal/docente/comunicados           → crear comunicado
 * DELETE /api/portal/docente/comunicados/{id}   → eliminar comunicado
 *
 * Todos requieren la cabecera Authorization: Bearer <JWT>.
 * El código del docente se extrae del token via DocenteService.
 */
@RestController
@RequestMapping("/api/portal/docente/comunicados")
@RequiredArgsConstructor
public class ComunicadoController {

    private final ComunicadoService comunicadoService;

    /** Lista todos los comunicados del docente autenticado. */
    @GetMapping
    public ResponseEntity<List<ComunicadoDto>> listar(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(comunicadoService.getComunicados(user.getUsername()));
    }

    /** Devuelve las aulas asignadas al docente para el selector del formulario. */
    @GetMapping("/mis-aulas")
    public ResponseEntity<List<AulaDto>> misAulas(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(comunicadoService.getMisAulas(user.getUsername()));
    }

    /** Crea un nuevo comunicado. Devuelve el DTO del comunicado creado. */
    @PostMapping
    public ResponseEntity<ComunicadoDto> crear(
            @AuthenticationPrincipal UserDetails user,
            @Valid @RequestBody NuevoComunicadoRequest request) {
        return ResponseEntity.ok(
                comunicadoService.crearComunicado(request, user.getUsername()));
    }

    /** Elimina un comunicado por su id (solo si pertenece al docente). */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> eliminar(
            @AuthenticationPrincipal UserDetails user,
            @PathVariable long id) {
        comunicadoService.eliminarComunicado(id, user.getUsername());
        return ResponseEntity.ok(Map.of("mensaje", "Comunicado eliminado"));
    }
}
