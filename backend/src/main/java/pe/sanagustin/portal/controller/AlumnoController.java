package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.*;
import pe.sanagustin.portal.service.AlumnoService;

import java.security.Principal;
import java.util.List;

/**
 * Endpoints del portal del alumno.
 *
 * GET /api/portal/alumno/mis-cursos
 * GET /api/portal/alumno/cursos/{idAulaCurso}/asistencia
 * GET /api/portal/alumno/cursos/{idAulaCurso}/contenido
 * GET /api/portal/alumno/cursos/{idAulaCurso}/tareas
 * GET /api/portal/alumno/cursos/{idAulaCurso}/actividades
 * GET /api/portal/alumno/cursos/{idAulaCurso}/reportes
 */
@RestController
@RequestMapping("/api/portal/alumno")
@RequiredArgsConstructor
public class AlumnoController {

    private final AlumnoService alumnoService;

    @GetMapping("/mis-cursos")
    public ResponseEntity<List<CursoAlumnoDto>> getMisCursos(Principal principal) {
        return ResponseEntity.ok(alumnoService.getMisCursos(principal.getName()));
    }

    @GetMapping("/cursos/{idAulaCurso}/asistencia")
    public ResponseEntity<AsistenciaCursoDto> getAsistencia(
            @PathVariable long idAulaCurso,
            Principal principal) {
        return ResponseEntity.ok(alumnoService.getAsistencia(principal.getName(), idAulaCurso));
    }

    @GetMapping("/cursos/{idAulaCurso}/contenido")
    public ResponseEntity<List<MaterialAlumnoDto>> getContenido(
            @PathVariable long idAulaCurso) {
        return ResponseEntity.ok(alumnoService.getContenido(idAulaCurso));
    }

    @GetMapping("/cursos/{idAulaCurso}/tareas")
    public ResponseEntity<List<TareaAlumnoDto>> getTareas(
            @PathVariable long idAulaCurso,
            Principal principal) {
        return ResponseEntity.ok(alumnoService.getTareas(principal.getName(), idAulaCurso));
    }

    @GetMapping("/cursos/{idAulaCurso}/actividades")
    public ResponseEntity<List<ActividadAlumnoDto>> getActividades(
            @PathVariable long idAulaCurso,
            Principal principal) {
        return ResponseEntity.ok(alumnoService.getActividades(principal.getName(), idAulaCurso));
    }

    @GetMapping("/cursos/{idAulaCurso}/reportes")
    public ResponseEntity<List<ReporteAlumnoDto>> getReportes(
            @PathVariable long idAulaCurso,
            Principal principal) {
        return ResponseEntity.ok(alumnoService.getReportes(principal.getName(), idAulaCurso));
    }

    @GetMapping("/calificaciones-globales")
    public ResponseEntity<List<CalificacionGlobalDto>> getCalificacionesGlobales(Principal principal) {
        return ResponseEntity.ok(alumnoService.getCalificacionesGlobales(principal.getName()));
    }

    @GetMapping("/asistencia-global")
    public ResponseEntity<List<AsistenciaGlobalDto>> getAsistenciasGlobales(Principal principal) {
        return ResponseEntity.ok(alumnoService.getAsistenciasGlobales(principal.getName()));
    }
}
