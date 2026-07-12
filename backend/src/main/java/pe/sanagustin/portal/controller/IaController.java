package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.*;
import pe.sanagustin.portal.service.IaService;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class IaController {

    private final IaService iaService;

    @GetMapping("/api/portal/docente/predicciones/{idAlumno}/ia-advisory")
    public CompletableFuture<ResponseEntity<Map<String, String>>> obtenerRecomendaciones(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable Integer idAlumno,
            @RequestParam double asistencia,
            @RequestParam double promedio,
            @RequestParam String causas) {
        
        return iaService.obtenerRecomendaciones(userDetails.getUsername(), idAlumno, asistencia, promedio, causas)
                .thenApply(ResponseEntity::ok);
    }

    @PostMapping("/api/portal/docente/predicciones/feedback-plan")
    public CompletableFuture<ResponseEntity<Map<String, String>>> guardarFeedbackPlan(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody FeedbackPlanRequest request) {

        return iaService.guardarFeedbackPlan(userDetails.getUsername(), request)
                .thenApply(ResponseEntity::ok);
    }

    @GetMapping(value = "/api/portal/docente/predicciones/{idAlumno}/generar-acta", produces = "text/html")
    public ResponseEntity<String> generarActaHTML(@PathVariable Integer idAlumno) {
        String html = iaService.generarActaHTML(idAlumno);
        return ResponseEntity.ok(html);
    }

    @PostMapping("/api/portal/docente/mensajes/ia-redactar")
    public CompletableFuture<ResponseEntity<Map<String, String>>> redactarComoDocente(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody RedactarMensajeRequest request) {
        
        return iaService.redactarComoDocente(userDetails.getUsername(), request)
                .thenApply(res -> ResponseEntity.ok(Map.of("resultado", res)));
    }

    @PostMapping("/api/portal/padre/mensajes/ia-redactar")
    public CompletableFuture<ResponseEntity<Map<String, String>>> redactarComoPadre(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody RedactarPadreRequest request) {
        
        return iaService.redactarComoPadre(userDetails.getUsername(), request)
                .thenApply(res -> ResponseEntity.ok(Map.of("resultado", res)));
    }

    @GetMapping("/api/admin/bi/ia-analisis")
    public CompletableFuture<ResponseEntity<Map<String, String>>> analizarBiEscolar() {
        return iaService.analizarBiEscolar()
                .thenApply(res -> ResponseEntity.ok(Map.of("resultado", res)));
    }

    @GetMapping("/api/admin/bi/ia-alertas-efectividad")
    public ResponseEntity<List<Map<String, Object>>> getAlertasEfectividad() {
        List<Map<String, Object>> alerts = iaService.getAlertasEfectividad();
        return ResponseEntity.ok(alerts);
    }

    @GetMapping("/api/admin/bi/ia-tutor-scores")
    public CompletableFuture<ResponseEntity<Map<String, Object>>> getTutorScores() {
        return iaService.getTutorScores()
                .thenApply(ResponseEntity::ok);
    }

    @PostMapping("/api/portal/alumno/ia-chat")
    public CompletableFuture<ResponseEntity<Map<String, String>>> chatMaterial(@RequestBody ChatMaterialRequest request) {
        return iaService.chatMaterial(request)
                .thenApply(ResponseEntity::ok);
    }
}
