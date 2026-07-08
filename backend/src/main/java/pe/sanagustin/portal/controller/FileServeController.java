package pe.sanagustin.portal.controller;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.CrossOrigin;

import java.io.File;

@RestController
@CrossOrigin(origins = "*")
public class FileServeController {

    @GetMapping("/uploads/materiales/{filename}")
    public ResponseEntity<Resource> serveMaterial(@PathVariable String filename) {
        File file = new File("uploads/materiales/" + filename);
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }
        
        Resource resource = new FileSystemResource(file);
        String contentType = "application/octet-stream";
        
        String lower = filename.toLowerCase();
        if (lower.endsWith(".pdf")) {
            contentType = "application/pdf";
        } else if (lower.endsWith(".mp4")) {
            contentType = "video/mp4";
        } else if (lower.endsWith(".png")) {
            contentType = "image/png";
        } else if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
            contentType = "image/jpeg";
        } else if (lower.endsWith(".doc")) {
            contentType = "application/msword";
        } else if (lower.endsWith(".docx")) {
            contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        }
        
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getName() + "\"")
                .body(resource);
    }

    @GetMapping("/uploads/audios/{filename}")
    public ResponseEntity<Resource> serveAudio(@PathVariable String filename) {
        File file = new File("uploads/audios/" + filename);
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }
        
        Resource resource = new FileSystemResource(file);
        String contentType = "audio/webm";
        
        String lower = filename.toLowerCase();
        if (lower.endsWith(".mp3")) {
            contentType = "audio/mpeg";
        } else if (lower.endsWith(".wav")) {
            contentType = "audio/wav";
        }
        
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getName() + "\"")
                .body(resource);
    }
}
