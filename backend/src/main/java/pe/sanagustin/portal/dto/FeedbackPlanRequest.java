package pe.sanagustin.portal.dto;

public record FeedbackPlanRequest(
    Integer idAlumno,
    Integer checkIndex,
    String feedback
) {}
