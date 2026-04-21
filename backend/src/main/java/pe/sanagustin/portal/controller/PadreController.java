package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
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
}
