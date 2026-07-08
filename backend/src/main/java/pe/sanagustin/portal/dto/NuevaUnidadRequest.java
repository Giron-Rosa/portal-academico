package pe.sanagustin.portal.dto;

import java.util.List;

public record NuevaUnidadRequest(
    Integer numero,
    String titulo,
    String bimestre,
    String semanas,
    List<String> objetivos,
    List<String> indicadores,
    List<String> contenidos,
    String estado
) {}
