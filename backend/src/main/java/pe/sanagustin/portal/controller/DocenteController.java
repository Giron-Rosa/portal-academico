package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.sanagustin.portal.dto.AlumnoPrediccionDto;
import pe.sanagustin.portal.dto.CursoDocenteDto;
import pe.sanagustin.portal.dto.HorarioDocenteDto;
import pe.sanagustin.portal.service.DocenteService;

import java.util.List;

@RestController
@RequestMapping("/api/portal/docente")
@RequiredArgsConstructor
public class DocenteController {

    private final DocenteService docenteService;

    /** Devuelve los cursos asignados al docente autenticado. */
    @GetMapping("/mis-cursos")
    public ResponseEntity<List<CursoDocenteDto>> getMisCursos(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(docenteService.getMisCursos(userDetails.getUsername()));
    }

    /**
     * Devuelve el horario semanal (Lunes-Viernes) del docente autenticado.
     * La administración es responsable de cargar los registros en la tabla
     * {@code horarios}; este endpoint sólo los lee y los sirve al frontend.
     */
    @GetMapping("/mi-horario")
    public ResponseEntity<List<HorarioDocenteDto>> getMiHorario(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(docenteService.getHorario(userDetails.getUsername()));
    }

    /**
     * Dashboard de alertas tempranas / predicciones de deserción.
     * Devuelve la asistencia acumulada y el promedio de notas de cada alumno
     * en las aulas asignadas al docente autenticado.
     * GET /api/portal/docente/predicciones
     */
    @GetMapping("/predicciones")
    public ResponseEntity<List<AlumnoPrediccionDto>> getPredicciones(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(docenteService.getPredicciones(userDetails.getUsername()));
    }
}

