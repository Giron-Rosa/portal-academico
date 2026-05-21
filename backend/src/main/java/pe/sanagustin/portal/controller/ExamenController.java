package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.ActualizarNotaExamenRequest;
import pe.sanagustin.portal.dto.ExamenDto;
import pe.sanagustin.portal.dto.NotaExamenDto;
import pe.sanagustin.portal.dto.NuevoExamenRequest;
import pe.sanagustin.portal.service.ExamenService;

import java.util.List;

/**
 * GET  /api/portal/docente/cursos/{idAulaCurso}/examenes
 * POST /api/portal/docente/cursos/{idAulaCurso}/examenes
 * DELETE /api/portal/docente/examenes/{idExamen}
 * GET  /api/portal/docente/examenes/{idExamen}/notas
 * PATCH /api/portal/docente/examenes/notas/{idNota}
 */
@RestController
@RequestMapping("/api/portal/docente")
@RequiredArgsConstructor
public class ExamenController {

    private final ExamenService examenService;

    @GetMapping("/cursos/{idAulaCurso}/examenes")
    public List<ExamenDto> listar(
            @PathVariable long idAulaCurso,
            @AuthenticationPrincipal UserDetails user) {
        return examenService.getExamenes(idAulaCurso, user.getUsername());
    }

    @PostMapping("/cursos/{idAulaCurso}/examenes")
    @ResponseStatus(HttpStatus.CREATED)
    public ExamenDto crear(
            @PathVariable long idAulaCurso,
            @RequestBody NuevoExamenRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return examenService.crearExamen(idAulaCurso, req, user.getUsername());
    }

    @DeleteMapping("/examenes/{idExamen}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(
            @PathVariable long idExamen,
            @AuthenticationPrincipal UserDetails user) {
        examenService.eliminarExamen(idExamen, user.getUsername());
    }

    @GetMapping("/examenes/{idExamen}/notas")
    public List<NotaExamenDto> notas(
            @PathVariable long idExamen,
            @AuthenticationPrincipal UserDetails user) {
        return examenService.getNotas(idExamen, user.getUsername());
    }

    @PatchMapping("/examenes/notas/{idNota}")
    public NotaExamenDto actualizarNota(
            @PathVariable long idNota,
            @RequestBody ActualizarNotaExamenRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return examenService.actualizarNota(idNota, req, user.getUsername());
    }
}
