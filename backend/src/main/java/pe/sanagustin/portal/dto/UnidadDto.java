package pe.sanagustin.portal.dto;

import java.util.List;

public record UnidadDto(
    Long idUnidad,
    Long idAulaCurso,
    Integer numero,
    String titulo,
    String bimestre,
    String semanas,
    List<String> objetivos,
    List<String> indicadores,
    List<String> contenidos,
    String estado,
    String fechaConclusion
) {}
