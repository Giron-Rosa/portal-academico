package pe.sanagustin.portal.dto;

public record ExamenDto(
        long    id,
        int     numeroExamen,
        int     semana,
        int     clase,
        String  titulo,
        String  descripcion,
        String  tipo,          // escrito | oral | online | practico
        String  fechaExamen,   // "DD/MM/YYYY" o null
        Integer duracionMinutos,
        int     notaMaxima,
        String  url,
        String  fechaCreacion,
        int     totalAlumnos,
        int     asistieron,
        int     noAsistieron,
        int     calificados
) {}
