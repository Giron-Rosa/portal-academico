package pe.sanagustin.portal.controller;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import pe.sanagustin.portal.service.GeminiService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/pdf-study")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class PdfStudyController {

    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;

    @PostMapping(value = "/analyze", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> analyzePdf(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty() || !MediaType.APPLICATION_PDF_VALUE.equals(file.getContentType())) {
            return ResponseEntity.badRequest().body("Debe proporcionar un archivo PDF válido.");
        }

        try {
            byte[] bytes = file.getBytes();
            String result = geminiService.analyzePdf(bytes);
            return ResponseEntity.ok().contentType(MediaType.APPLICATION_JSON).body(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error al analizar el PDF: " + e.getMessage());
        }
    }

    @PostMapping(value = "/chat", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> chatWithPdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam("question") String question,
            @RequestParam(value = "history", required = false) String historyJson) {

        if (file.isEmpty() || !MediaType.APPLICATION_PDF_VALUE.equals(file.getContentType())) {
            return ResponseEntity.badRequest().body("Debe proporcionar un archivo PDF válido.");
        }

        try {
            byte[] bytes = file.getBytes();
            List<Map<String, Object>> chatHistory = new ArrayList<>();
            if (historyJson != null && !historyJson.trim().isEmpty()) {
                chatHistory = objectMapper.readValue(historyJson, new TypeReference<List<Map<String, Object>>>() {});
            }

            String reply = geminiService.chatWithPdf(bytes, question, chatHistory);
            
            // Return raw text response or JSON wrap
            return ResponseEntity.ok(Map.of("reply", reply));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error en la conversación con el PDF: " + e.getMessage());
        }
    }
}
