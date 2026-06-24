package pe.sanagustin.portal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class NuevoChatRequest {

    @NotNull(message = "El alumno es obligatorio")
    private Long idAlumno;

    @NotNull(message = "El padre es obligatorio")
    private Long idPadre;

    @NotNull(message = "El aula-curso es obligatorio")
    private Long idAulaCurso;

    @NotBlank(message = "El asunto es obligatorio")
    private String asunto;

    @NotBlank(message = "El mensaje no puede estar vacío")
    private String cuerpo;
}
