package pe.sanagustin.portal.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.AlumnoContextoDto;
import pe.sanagustin.portal.dto.MensajeDetalleDto;
import pe.sanagustin.portal.dto.MensajeResumenDto;
import pe.sanagustin.portal.dto.ResponderRequest;
import pe.sanagustin.portal.service.MensajeService;

import java.util.List;

/**
 * Endpoints de mensajería para el portal docente.
 * Base: /api/portal/docente/mensajes
 * Requiere rol MAESTRO (cubierto por SecurityConfig).
 */
@RestController
@RequestMapping("/api/portal/docente/mensajes")
@RequiredArgsConstructor
public class MensajeController {

    private final MensajeService mensajeService;

    /**
     * GET /api/portal/docente/mensajes
     * Devuelve todos los mensajes recibidos por el docente autenticado,
     * ordenados: primero los no leídos, luego los más recientes.
     */
    @GetMapping
    public ResponseEntity<List<MensajeResumenDto>> getMensajes(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                mensajeService.getMensajes(userDetails.getUsername()));
    }

    /**
     * GET /api/portal/docente/mensajes/{id}
     * Devuelve el mensaje completo con el hilo de respuestas.
     * Marca el mensaje como leído al consultarlo.
     */
    @GetMapping("/{id}")
    public ResponseEntity<MensajeDetalleDto> getDetalle(
            @PathVariable long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                mensajeService.getDetalle(id, userDetails.getUsername()));
    }

    /**
     * POST /api/portal/docente/mensajes/{id}/responder
     * El docente agrega una respuesta al hilo del mensaje indicado.
     * Retorna 200 OK sin cuerpo.
     */
    @PostMapping("/{id}/responder")
    public ResponseEntity<Void> responder(
            @PathVariable long id,
            @Valid @RequestBody ResponderRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        mensajeService.responder(id, request.getCuerpo(), userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    /**
     * GET /api/portal/docente/mensajes/alumno-contexto/{idAlumno}
     * Devuelve el resumen del alumno para el panel lateral de mensajes.
     */
    @GetMapping("/alumno-contexto/{idAlumno}")
    public ResponseEntity<AlumnoContextoDto> getContextoAlumno(
            @PathVariable long idAlumno,
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(
                mensajeService.getContextoAlumno(idAlumno, userDetails.getUsername()));
    }
}
