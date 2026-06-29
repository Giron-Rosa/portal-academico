package pe.sanagustin.portal.dto;

public record AdminDashboardKpisDto(
        long totalEstudiantes,
        long totalDocentes,
        long totalCursos,
        double morosidadPct
) {}
