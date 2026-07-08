package pe.sanagustin.portal.dto;

public record ColegioConfigDto(
        Long idConfig,
        String nombre,
        String ruc,
        String direccion,
        String telefono,
        String email,
        String logoUrl,
        String ciudad,
        String distrito,
        String nivel,
        String director,
        String mision,
        String vision
) {}
