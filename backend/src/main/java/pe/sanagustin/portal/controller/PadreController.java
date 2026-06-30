package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.sanagustin.portal.dto.AsistenciaDetalleHijoDto;
import pe.sanagustin.portal.dto.CursoDetalleHijoDto;
import pe.sanagustin.portal.dto.HijoResumenDto;
import pe.sanagustin.portal.dto.HorarioDocenteDto;
import pe.sanagustin.portal.service.PadreService;

import java.util.List;

@RestController
@RequestMapping("/api/portal/padre")
@RequiredArgsConstructor
public class PadreController {

    private final PadreService padreService;

    @GetMapping("/resumen")
    public ResponseEntity<List<HijoResumenDto>> getResumen(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(padreService.getResumen(userDetails.getUsername()));
    }

    /** GET /api/portal/padre/cursos/{codigoAlumno}
     *  Devuelve los cursos del hijo con tareas, exámenes y métricas de asistencia.
     */
    @GetMapping("/cursos/{codigoAlumno}")
    public ResponseEntity<List<CursoDetalleHijoDto>> getCursosDetalle(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String codigoAlumno) {
        return ResponseEntity.ok(
                padreService.getCursosDetalle(userDetails.getUsername(), codigoAlumno));
    }

    /** GET /api/portal/padre/asistencia/{codigoAlumno}
     *  Devuelve el historial detallado de asistencia y resumen de métricas del estudiante.
     */
    @GetMapping("/asistencia/{codigoAlumno}")
    public ResponseEntity<AsistenciaDetalleHijoDto> getAsistenciaDetalle(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String codigoAlumno) {
        return ResponseEntity.ok(
                padreService.getAsistenciaDetalle(userDetails.getUsername(), codigoAlumno));
    }

    /** GET /api/portal/padre/eventos/{codigoAlumno}
     *  Devuelve los comunicados y eventos del aula del estudiante.
     */
    @GetMapping("/eventos/{codigoAlumno}")
    public ResponseEntity<List<pe.sanagustin.portal.dto.EventoHijoDto>> getEventos(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String codigoAlumno) {
        return ResponseEntity.ok(
                padreService.getEventos(userDetails.getUsername(), codigoAlumno));
    }

    /** GET /api/portal/padre/pagos/{codigoAlumno}
     *  Devuelve la lista de pensiones y pagos del estudiante.
     */
    @GetMapping("/pagos/{codigoAlumno}")
    public ResponseEntity<List<pe.sanagustin.portal.dto.PagoHijoDto>> getPagos(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String codigoAlumno) {
        return ResponseEntity.ok(
                padreService.getPagos(userDetails.getUsername(), codigoAlumno));
    }

    /** GET /api/portal/padre/horario/{codigoAlumno}
     *  Devuelve el horario de clases semanal del estudiante.
     */
    @GetMapping("/horario/{codigoAlumno}")
    public ResponseEntity<List<HorarioDocenteDto>> getHorarioHijo(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String codigoAlumno) {
        return ResponseEntity.ok(
                padreService.getHorarioHijo(userDetails.getUsername(), codigoAlumno));
    }
}
