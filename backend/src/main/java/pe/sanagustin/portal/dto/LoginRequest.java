package pe.sanagustin.portal.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class LoginRequest {

    @NotBlank(message = "El identificador es obligatorio")
    private String identifier;

    @NotBlank(message = "La contraseña es obligatoria")
    private String contrasena;
}
