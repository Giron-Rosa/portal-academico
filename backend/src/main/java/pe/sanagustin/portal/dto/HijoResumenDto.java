package pe.sanagustin.portal.dto;

import java.util.List;

public record HijoResumenDto(
        String            nombre,
        String            apellido,
        String            codigo,
        String            grado,
        String            seccion,
        String            turno,
        String            periodo,
        String            parentesco,
        List<CursoHijoDto> cursos
) {}
