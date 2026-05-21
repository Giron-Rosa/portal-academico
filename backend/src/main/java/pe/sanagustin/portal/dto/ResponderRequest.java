package pe.sanagustin.portal.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

/** Cuerpo de la petición POST al responder un mensaje. */
@Getter
@Setter
public class ResponderRequest {

    @NotBlank(message = "La respuesta no puede estar vacía")
    private String cuerpo;
}
