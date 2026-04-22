package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.sanagustin.portal.dto.CursoAlumnoDto;
import pe.sanagustin.portal.service.AlumnoService;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/portal/alumno")
@RequiredArgsConstructor
public class AlumnoController {

    private final AlumnoService alumnoService;

    @GetMapping("/mis-cursos")
    public ResponseEntity<List<CursoAlumnoDto>> getMisCursos(Principal principal) {
        return ResponseEntity.ok(alumnoService.getMisCursos(principal.getName()));
    }
}
