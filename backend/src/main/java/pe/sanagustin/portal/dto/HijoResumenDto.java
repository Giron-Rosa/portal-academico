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
        double            promedio,
        double            asistencia,
        int               cursosRiesgo,
        double            entregaTareas,
        String            estado,
        int               cuotasPendientes,
        List<CursoHijoDto> cursos
) {}
