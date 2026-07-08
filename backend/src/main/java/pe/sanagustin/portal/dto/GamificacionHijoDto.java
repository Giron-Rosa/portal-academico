package pe.sanagustin.portal.dto;

import java.util.List;

public record GamificacionHijoDto(
        List<MisionDto> misiones,
        List<InsigniaDto> insignias
) {}
