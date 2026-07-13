package pe.sanagustin.portal.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentNoteDto {
    private Long idNota;
    private String titulo;
    private String contenido;
    private String resumenIa;
    private String guionPodcast;
    private String urlDocumento;
    private LocalDateTime fechaCreacion;
    private LocalDateTime fechaActualizacion;
}
