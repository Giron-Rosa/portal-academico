package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.MaterialDto;
import pe.sanagustin.portal.dto.NuevoMaterialRequest;
import pe.sanagustin.portal.service.MaterialService;

import java.util.List;

/**
 * Endpoints para gestionar los materiales didácticos de un curso.
 * Base: /api/portal/docente/cursos/{idAulaCurso}/materiales
 */
@RestController
@RequestMapping("/api/portal/docente/cursos")
@RequiredArgsConstructor
public class MaterialController {

    private final MaterialService materialService;

    /** GET /api/portal/docente/cursos/{idAulaCurso}/materiales */
    @GetMapping("/{idAulaCurso}/materiales")
    public List<MaterialDto> listar(
            @PathVariable long idAulaCurso,
            @AuthenticationPrincipal UserDetails user) {
        return materialService.getMateriales(idAulaCurso, user.getUsername());
    }

    /** POST /api/portal/docente/cursos/{idAulaCurso}/materiales */
    @PostMapping(value = "/{idAulaCurso}/materiales", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public MaterialDto crear(
            @PathVariable long idAulaCurso,
            @RequestParam("semana") int semana,
            @RequestParam("clase") int clase,
            @RequestParam("titulo") String titulo,
            @RequestParam("tipo") String tipo,
            @RequestParam(value = "url", required = false) String url,
            @RequestParam(value = "file", required = false) org.springframework.web.multipart.MultipartFile file,
            @AuthenticationPrincipal UserDetails user) {
        NuevoMaterialRequest req = new NuevoMaterialRequest();
        req.setSemana(semana);
        req.setClase(clase);
        req.setTitulo(titulo);
        req.setTipo(tipo);
        req.setUrl(url);
        return materialService.crearMaterial(idAulaCurso, req, file, user.getUsername());
    }

    /** DELETE /api/portal/docente/cursos/materiales/{idMaterial} */
    @DeleteMapping("/materiales/{idMaterial}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(
            @PathVariable long idMaterial,
            @AuthenticationPrincipal UserDetails user) {
        materialService.eliminarMaterial(idMaterial, user.getUsername());
    }
}
