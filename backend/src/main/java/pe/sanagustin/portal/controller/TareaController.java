package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.ActualizarNotaRequest;
import pe.sanagustin.portal.dto.NotaTareaDto;
import pe.sanagustin.portal.dto.NuevaTareaRequest;
import pe.sanagustin.portal.dto.TareaDto;
import pe.sanagustin.portal.service.TareaService;

import java.util.List;

/**
 * Gestión de tareas y calificaciones por aula_curso.
 *
 * GET  /api/portal/docente/cursos/{idAulaCurso}/tareas
 * POST /api/portal/docente/cursos/{idAulaCurso}/tareas
 * DELETE /api/portal/docente/tareas/{idTarea}
 * GET  /api/portal/docente/tareas/{idTarea}/notas
 * PATCH /api/portal/docente/tareas/notas/{idNota}
 */
@RestController
@RequestMapping("/api/portal/docente")
@RequiredArgsConstructor
public class TareaController {

    private final TareaService tareaService;

    @GetMapping("/cursos/{idAulaCurso}/tareas")
    public List<TareaDto> listar(
            @PathVariable long idAulaCurso,
            @AuthenticationPrincipal UserDetails user) {
        return tareaService.getTareas(idAulaCurso, user.getUsername());
    }

    @PostMapping("/cursos/{idAulaCurso}/tareas")
    @ResponseStatus(HttpStatus.CREATED)
    public TareaDto crear(
            @PathVariable long idAulaCurso,
            @RequestBody NuevaTareaRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return tareaService.crearTarea(idAulaCurso, req, user.getUsername());
    }

    @DeleteMapping("/tareas/{idTarea}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(
            @PathVariable long idTarea,
            @AuthenticationPrincipal UserDetails user) {
        tareaService.eliminarTarea(idTarea, user.getUsername());
    }

    @GetMapping("/tareas/{idTarea}/notas")
    public List<NotaTareaDto> notas(
            @PathVariable long idTarea,
            @AuthenticationPrincipal UserDetails user) {
        return tareaService.getNotas(idTarea, user.getUsername());
    }

    @PatchMapping("/tareas/notas/{idNota}")
    public NotaTareaDto actualizarNota(
            @PathVariable long idNota,
            @RequestBody ActualizarNotaRequest req,
            @AuthenticationPrincipal UserDetails user) {
        return tareaService.actualizarNota(idNota, req, user.getUsername());
    }
}
