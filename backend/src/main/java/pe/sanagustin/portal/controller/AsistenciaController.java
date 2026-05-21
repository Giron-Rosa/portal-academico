package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.GuardarAsistenciaRequest;
import pe.sanagustin.portal.dto.SesionAsistenciaDto;
import pe.sanagustin.portal.service.AsistenciaService;

import java.time.LocalDate;
import java.util.List;

/**
 * GET    /api/portal/docente/cursos/{idAulaCurso}/asistencia?fecha=YYYY-MM-DD
 * POST   /api/portal/docente/cursos/{idAulaCurso}/asistencia
 * GET    /api/portal/docente/cursos/{idAulaCurso}/asistencia/fechas
 */
@RestController
@RequiredArgsConstructor
public class AsistenciaController {

    private final AsistenciaService asistenciaService;

    @GetMapping("/api/portal/docente/cursos/{idAulaCurso}/asistencia")
    public SesionAsistenciaDto getSesion(
            @PathVariable long idAulaCurso,
            @RequestParam(defaultValue = "") String fecha,
            @AuthenticationPrincipal UserDetails user) {
        if (fecha.isBlank()) fecha = LocalDate.now().toString();
        return asistenciaService.getSesion(idAulaCurso, fecha, user.getUsername());
    }

    @PostMapping("/api/portal/docente/cursos/{idAulaCurso}/asistencia")
    public SesionAsistenciaDto guardar(
            @PathVariable long idAulaCurso,
            @RequestBody GuardarAsistenciaRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return asistenciaService.guardarSesion(idAulaCurso, req, user.getUsername());
    }

    @GetMapping("/api/portal/docente/cursos/{idAulaCurso}/asistencia/fechas")
    public List<String> getFechas(
            @PathVariable long idAulaCurso,
            @AuthenticationPrincipal UserDetails user) {
        return asistenciaService.getFechasConSesion(idAulaCurso, user.getUsername());
    }
}
