package pe.sanagustin.portal.dto;

public record PermisoRolDto(
        Long idPermiso,
        Long idRol,
        String rolNombre,
        Long idModulo,
        String moduloNombre,
        boolean puedeVer,
        boolean puedeCrear,
        boolean puedeEditar,
        boolean puedeBorrar
) {}
