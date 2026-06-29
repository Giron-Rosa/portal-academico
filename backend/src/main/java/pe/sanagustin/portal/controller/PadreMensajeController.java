package pe.sanagustin.portal.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.DocenteDisponibleDto;
import pe.sanagustin.portal.dto.MensajeDetalleDto;
import pe.sanagustin.portal.dto.MensajeResumenDto;
import pe.sanagustin.portal.dto.NuevoChatRequest;
import pe.sanagustin.portal.dto.ResponderRequest;
import pe.sanagustin.portal.dto.RespuestaResumenDto;
import pe.sanagustin.portal.service.MensajeService;

import java.util.List;
import java.util.Map;

/**
 * Endpoints de mensajería para el portal de padres.
 * Base: /api/portal/padre/mensajes
 */
@RestController
@RequestMapping("/api/portal/padre/mensajes")
@RequiredArgsConstructor
public class PadreMensajeController {

    private final MensajeService mensajeService;

    /**
     * GET /api/portal/padre/mensajes
     * Devuelve la lista de chats del padre autenticado.
     */
    @GetMapping
    public ResponseEntity<List<MensajeResumenDto>> getMensajes(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                mensajeService.getMensajesPadre(userDetails.getUsername()));
    }

    /**
     * GET /api/portal/padre/mensajes/{id}
     * Obtiene los detalles de un chat y lo marca como leído por el padre.
     */
    @GetMapping("/{id}")
    public ResponseEntity<MensajeDetalleDto> getDetalle(
            @PathVariable long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                mensajeService.getDetallePadre(id, userDetails.getUsername()));
    }

    /**
     * GET /api/portal/padre/mensajes/{id}/respuestas-paginadas
     * Devuelve respuestas del chat en bloques de paginación (Lazy loading).
     */
    @GetMapping("/{id}/respuestas-paginadas")
    public ResponseEntity<List<RespuestaResumenDto>> getRespuestasPaginadas(
            @PathVariable long id,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(
                mensajeService.getRespuestasPaginadas(id, page, size));
    }

    /**
     * POST /api/portal/padre/mensajes/{id}/responder
     * Envía una respuesta al chat.
     */
    @PostMapping("/{id}/responder")
    public ResponseEntity<Void> responder(
            @PathVariable long id,
            @Valid @RequestBody ResponderRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        mensajeService.responderPadre(id, request.getCuerpo(), userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    /**
     * GET /api/portal/padre/mensajes/docentes-disponibles
     * Obtiene la lista de docentes disponibles para sus hijos.
     */
    @GetMapping("/docentes-disponibles")
    public ResponseEntity<List<DocenteDisponibleDto>> getDocentesDisponibles(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                mensajeService.getDocentesDisponiblesParaPadre(userDetails.getUsername()));
    }

    /**
     * POST /api/portal/padre/mensajes/iniciar
     * Inicia un nuevo chat con un docente.
     */
    @PostMapping("/iniciar")
    public ResponseEntity<Map<String, Long>> iniciarChat(
            @Valid @RequestBody NuevoChatRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        long id = mensajeService.iniciarChatPadre(request, userDetails.getUsername());
        return ResponseEntity.ok(Map.of("id", id));
    }
}
