package pe.sanagustin.portal.dto;

public record PadreAdminDto(
        Long idPadre,
        String codigo,
        String nombre,
        String apellido,
        String email,
        String telefono,
        String dni,
        String hijosVinculados
) {}
