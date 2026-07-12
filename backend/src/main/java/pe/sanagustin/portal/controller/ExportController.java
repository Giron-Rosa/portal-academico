package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import pe.sanagustin.portal.service.ExportService;

import java.io.IOException;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class ExportController {

    private final ExportService exportService;

    // ── EXPORTACIÓN ADMINISTRATIVA (ESTUDIANTES) ─────────────────────────
    @GetMapping("/admin/export/estudiantes/excel")
    public ResponseEntity<byte[]> exportEstudiantesExcel() throws IOException {
        byte[] data = exportService.exportEstudiantesExcel();
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=reporte_estudiantes.xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }

    @GetMapping("/admin/export/estudiantes/pdf")
    public CompletableFuture<ResponseEntity<byte[]>> exportEstudiantesPdf() {
        return exportService.exportEstudiantesPdf().thenApply(data -> ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=reporte_estudiantes.pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(data));
    }

    // ── EXPORTACIÓN DOCENTE (CURSOS) ────────────────────────────────────
    @GetMapping("/portal/docente/export/curso/{id}/excel")
    public ResponseEntity<byte[]> exportCursoExcel(@PathVariable Long id) throws IOException {
        byte[] data = exportService.exportCursoExcel(id);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=reporte_curso_" + id + ".xlsx")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(data);
    }

    @GetMapping("/portal/docente/export/curso/{id}/pdf")
    public CompletableFuture<ResponseEntity<byte[]>> exportCursoPdf(@PathVariable Long id) {
        return exportService.exportCursoPdf(id).thenApply(data -> ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=reporte_curso_" + id + ".pdf")
                .contentType(MediaType.APPLICATION_PDF)
                .body(data));
    }
}
