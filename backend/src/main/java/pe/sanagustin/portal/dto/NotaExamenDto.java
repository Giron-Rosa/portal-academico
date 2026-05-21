package pe.sanagustin.portal.dto;

public record NotaExamenDto(
        long    idNotaExamen,
        long    idAlumno,
        String  codigo,
        String  nombres,
        boolean asistio,
        Double  nota
) {}
