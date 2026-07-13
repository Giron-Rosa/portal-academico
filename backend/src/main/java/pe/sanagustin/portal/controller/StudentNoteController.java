package pe.sanagustin.portal.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.dto.SaveNoteRequest;
import pe.sanagustin.portal.dto.StudentNoteDto;
import pe.sanagustin.portal.service.StudentNoteService;

import java.util.List;

@RestController
@RequestMapping("/api/portal/alumno/notes")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class StudentNoteController {

    private final StudentNoteService studentNoteService;

    @GetMapping
    public List<StudentNoteDto> listar(@AuthenticationPrincipal UserDetails userDetails) {
        return studentNoteService.getNotes(userDetails.getUsername());
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public StudentNoteDto crear(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SaveNoteRequest request) {
        return studentNoteService.createNote(userDetails.getUsername(), request);
    }

    @PutMapping("/{id}")
    public StudentNoteDto actualizar(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SaveNoteRequest request) {
        return studentNoteService.updateNote(id, userDetails.getUsername(), request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        studentNoteService.deleteNote(id, userDetails.getUsername());
    }

    @PostMapping("/{id}/resumen-ia")
    public StudentNoteDto generarResumenIa(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return studentNoteService.generarResumenIa(id, userDetails.getUsername());
    }

    @PostMapping("/upload")
    @ResponseStatus(HttpStatus.CREATED)
    public StudentNoteDto subirDocumento(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("file") org.springframework.web.multipart.MultipartFile file) {
        return studentNoteService.importNoteFromDocument(userDetails.getUsername(), file);
    }

    @PostMapping("/{id}/generar-podcast")
    public StudentNoteDto generarPodcast(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        return studentNoteService.generarPodcast(id, userDetails.getUsername());
    }

    @PostMapping("/importar-material/{idMaterial}")
    @ResponseStatus(HttpStatus.CREATED)
    public StudentNoteDto importarMaterial(
            @PathVariable Long idMaterial,
            @AuthenticationPrincipal UserDetails userDetails) {
        return studentNoteService.importarMaterial(idMaterial, userDetails.getUsername());
    }
}
