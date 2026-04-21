package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.sanagustin.portal.dto.CursoDocenteDto;
import pe.sanagustin.portal.service.DocenteService;

import java.util.List;

@RestController
@RequestMapping("/api/portal/docente")
@RequiredArgsConstructor
public class DocenteController {

    private final DocenteService docenteService;

    @GetMapping("/mis-cursos")
    public ResponseEntity<List<CursoDocenteDto>> getMisCursos(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(docenteService.getMisCursos(userDetails.getUsername()));
    }
}
