package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.AlumnoReportesDto;
import pe.sanagustin.portal.dto.NuevoReporteRequest;
import pe.sanagustin.portal.dto.ReporteDto;
import pe.sanagustin.portal.service.ReporteService;

import java.util.List;

/**
 * Docente:
 *   GET    /api/portal/docente/cursos/{idAulaCurso}/reportes
 *   POST   /api/portal/docente/cursos/{idAulaCurso}/reportes
 *   DELETE /api/portal/docente/reportes/{idReporte}
 *   PATCH  /api/portal/docente/reportes/{idReporte}/visibilidad
 *
 * Padre (para uso futuro del portal de padres):
 *   GET    /api/portal/padre/alumnos/{idAlumno}/reportes
 */
@RestController
@RequiredArgsConstructor
public class ReporteController {

    private final ReporteService reporteService;

    /* ──────────── DOCENTE ──────────── */

    @GetMapping("/api/portal/docente/cursos/{idAulaCurso}/reportes")
    public List<AlumnoReportesDto> listarDocente(
            @PathVariable long idAulaCurso,
            @AuthenticationPrincipal UserDetails user) {
        return reporteService.getReportesDocente(idAulaCurso, user.getUsername());
    }

    @PostMapping("/api/portal/docente/cursos/{idAulaCurso}/reportes")
    @ResponseStatus(HttpStatus.CREATED)
    public ReporteDto crear(
            @PathVariable long idAulaCurso,
            @RequestBody NuevoReporteRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return reporteService.crearReporte(idAulaCurso, req, user.getUsername());
    }

    @DeleteMapping("/api/portal/docente/reportes/{idReporte}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(
            @PathVariable long idReporte,
            @AuthenticationPrincipal UserDetails user) {
        reporteService.eliminarReporte(idReporte, user.getUsername());
    }

    @PatchMapping("/api/portal/docente/reportes/{idReporte}/visibilidad")
    public ReporteDto toggleVisibilidad(
            @PathVariable long idReporte,
            @AuthenticationPrincipal UserDetails user) {
        return reporteService.toggleVisibilidad(idReporte, user.getUsername());
    }

    /* ──────────── PADRE ──────────── */

    @GetMapping("/api/portal/padre/alumnos/{idAlumno}/reportes")
    public List<ReporteDto> listarPadre(
            @PathVariable long idAlumno,
            @AuthenticationPrincipal UserDetails user) {
        return reporteService.getReportesPadre(idAlumno, user.getUsername());
    }
}
