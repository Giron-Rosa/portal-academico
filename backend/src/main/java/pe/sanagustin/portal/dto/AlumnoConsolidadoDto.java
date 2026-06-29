package pe.sanagustin.portal.dto;

import java.util.List;

public record AlumnoConsolidadoDto(
    long idAlumno,
    String codigo,
    String nombres,
    boolean alertaRiesgo,
    int porcentajeAsistencia,
    List<String> estados
) {}
