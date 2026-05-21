package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.sanagustin.portal.dto.PendienteDto;
import pe.sanagustin.portal.service.PendienteService;

import java.util.List;

/**
 * GET /api/portal/docente/pendientes
 * Devuelve tareas y exámenes con alumnos sin calificar.
 */
@RestController
@RequiredArgsConstructor
public class PendienteController {

    private final PendienteService pendienteService;

    @GetMapping("/api/portal/docente/pendientes")
    public List<PendienteDto> getPendientes(@AuthenticationPrincipal UserDetails user) {
        return pendienteService.getPendientes(user.getUsername());
    }
}
