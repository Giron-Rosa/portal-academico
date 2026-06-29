package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.sanagustin.portal.dto.CursoDetalleHijoDto;
import pe.sanagustin.portal.dto.HijoResumenDto;
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
}
