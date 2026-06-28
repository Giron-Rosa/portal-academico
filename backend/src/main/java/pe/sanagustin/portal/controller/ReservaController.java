package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.DisponibilidadResponse;
import pe.sanagustin.portal.dto.NuevaReservaRequest;
import pe.sanagustin.portal.dto.ReservaDto;
import pe.sanagustin.portal.entity.EspacioReserva;
import pe.sanagustin.portal.service.ReservaService;

import java.util.List;

/**
 * Gestión de reservas de espacios para docentes.
 *
 * GET  /api/portal/docente/reservas
 * POST /api/portal/docente/reservas
 * POST /api/portal/docente/reservas/verificar
 * DELETE /api/portal/docente/reservas/{id}
 */
@RestController
@RequestMapping("/api/portal/docente")
@RequiredArgsConstructor
public class ReservaController {

    private final ReservaService reservaService;

    @GetMapping("/reservas")
    public ResponseEntity<List<ReservaDto>> listar(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(reservaService.getReservas(user.getUsername()));
    }

    @GetMapping("/reservas/espacios-disponibles")
    public ResponseEntity<List<EspacioReserva>> getEspaciosDisponibles(
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(reservaService.getEspaciosDisponibles(user.getUsername()));
    }

    @PostMapping("/reservas/verificar")
    public ResponseEntity<DisponibilidadResponse> verificar(
            @RequestBody NuevaReservaRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(reservaService.verificarDisponibilidad(user.getUsername(), req));
    }

    @PostMapping("/reservas")
    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<ReservaDto> crear(
            @RequestBody NuevaReservaRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(reservaService.crearReserva(user.getUsername(), req));
    }

    @PutMapping("/reservas/{id}")
    public ResponseEntity<ReservaDto> actualizar(
            @PathVariable long id,
            @RequestBody NuevaReservaRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return ResponseEntity.ok(reservaService.actualizarReserva(id, user.getUsername(), req));
    }

    @DeleteMapping("/reservas/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<Void> eliminar(
            @PathVariable long id,
            @AuthenticationPrincipal UserDetails user) {
        reservaService.eliminarReserva(id, user.getUsername());
        return ResponseEntity.noContent().build();
    }
}
