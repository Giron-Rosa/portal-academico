package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import pe.sanagustin.portal.dto.AlumnoReportesDto;
import pe.sanagustin.portal.dto.NuevoReporteRequest;
import pe.sanagustin.portal.dto.ReporteDto;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class ReporteService {

    private final EntityManager em;

    // ────────────────────────────────────────────────────────
    // Docente: listar todos los alumnos + sus reportes
    // ────────────────────────────────────────────────────────
    public List<AlumnoReportesDto> getReportesDocente(long idAulaCurso, String codigoDocente) {
        verificarAutorizacion(idAulaCurso, codigoDocente);

        /* Todos los alumnos matriculados (con o sin reportes) */
        String sqlAlumnos = """
                SELECT a.id_alumno, u.codigo, a.apellido || ' ' || a.nombre AS nombres
                FROM matriculas  m
                JOIN alumnos     a ON a.id_alumno  = m.id_alumno
                JOIN usuarios    u ON u.id_usuario = a.id_usuario
                JOIN aula_cursos ac ON ac.id_aula  = m.id_aula
                WHERE ac.id_aula_curso = :iac AND m.estado = 'activa'
                ORDER BY a.apellido, a.nombre
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> alumnos = em.createNativeQuery(sqlAlumnos)
                .setParameter("iac", idAulaCurso)
                .getResultList();

        /* Todos los reportes del aula_curso */
        String sqlReportes = """
                SELECT r.id_reporte, r.id_alumno, r.tipo, r.titulo,
                       r.descripcion,
                       TO_CHAR(r.fecha,          'DD/MM/YYYY') AS fecha,
                       r.visible_padre,
                       TO_CHAR(r.fecha_creacion, 'DD/MM/YYYY') AS fecha_creacion
                FROM reportes_alumno r
                WHERE r.id_aula_curso = :iac
                ORDER BY r.id_alumno, r.fecha DESC, r.fecha_creacion DESC
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> reportesRows = em.createNativeQuery(sqlReportes)
                .setParameter("iac", idAulaCurso)
                .getResultList();

        /* Agrupar reportes por id_alumno */
        Map<Long, List<ReporteDto>> reportesPorAlumno = new LinkedHashMap<>();
        for (Object[] r : reportesRows) {
            long idAlumno = ((Number) r[1]).longValue();
            reportesPorAlumno.computeIfAbsent(idAlumno, k -> new ArrayList<>())
                    .add(new ReporteDto(
                            ((Number) r[0]).longValue(),
                            (String)  r[2],
                            (String)  r[3],
                            (String)  r[4],
                            (String)  r[5],
                            (Boolean) r[6],
                            (String)  r[7]
                    ));
        }

        return alumnos.stream().map(a -> {
            long   idAlumno = ((Number) a[0]).longValue();
            List<ReporteDto> reps = reportesPorAlumno.getOrDefault(idAlumno, List.of());
            return new AlumnoReportesDto(
                    idAlumno,
                    (String) a[1],
                    (String) a[2],
                    reps.size(),
                    reps
            );
        }).toList();
    }

    // ────────────────────────────────────────────────────────
    // Padre: solo reportes visibles de su hijo (por idAlumno)
    // ────────────────────────────────────────────────────────
    public List<ReporteDto> getReportesPadre(long idAlumno, String codigoPadre) {
        /* Verificar que el padre tiene vínculo con el alumno */
        String check = """
                SELECT COUNT(*) FROM tutores t
                JOIN usuarios u ON u.id_usuario = t.id_usuario
                WHERE t.id_alumno = :ia AND u.codigo = :codigo AND t.activo = true
                """;
        Number cnt = (Number) em.createNativeQuery(check)
                .setParameter("ia",     idAlumno)
                .setParameter("codigo", codigoPadre)
                .getSingleResult();
        if (cnt.longValue() == 0)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");

        String sql = """
                SELECT r.id_reporte, r.tipo, r.titulo, r.descripcion,
                       TO_CHAR(r.fecha, 'DD/MM/YYYY'),
                       r.visible_padre,
                       TO_CHAR(r.fecha_creacion, 'DD/MM/YYYY')
                FROM reportes_alumno r
                WHERE r.id_alumno = :ia AND r.visible_padre = true
                ORDER BY r.fecha DESC, r.fecha_creacion DESC
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("ia", idAlumno)
                .getResultList();

        return rows.stream().map(r -> new ReporteDto(
                ((Number) r[0]).longValue(),
                (String)  r[1],
                (String)  r[2],
                (String)  r[3],
                (String)  r[4],
                (Boolean) r[5],
                (String)  r[6]
        )).toList();
    }

    // ────────────────────────────────────────────────────────
    // Crear reporte
    // ────────────────────────────────────────────────────────
    @Transactional
    public ReporteDto crearReporte(long idAulaCurso,
                                   NuevoReporteRequest req,
                                   String codigoDocente) {
        verificarAutorizacion(idAulaCurso, codigoDocente);

        /* Verificar que el alumno pertenece al aula_curso */
        String checkAlumno = """
                SELECT COUNT(*) FROM matriculas m
                JOIN aula_cursos ac ON ac.id_aula = m.id_aula
                WHERE ac.id_aula_curso = :iac AND m.id_alumno = :ia AND m.estado = 'activa'
                """;
        Number cntA = (Number) em.createNativeQuery(checkAlumno)
                .setParameter("iac", idAulaCurso)
                .setParameter("ia",  req.getIdAlumno())
                .getSingleResult();
        if (cntA.longValue() == 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "El alumno no pertenece al curso");

        String sql = """
                INSERT INTO reportes_alumno
                    (id_aula_curso, id_alumno, tipo, titulo, descripcion, fecha, visible_padre)
                VALUES (:iac, :ia, :tipo, :titulo, :desc, COALESCE(CAST(:fecha AS DATE), CURRENT_DATE), :vis)
                RETURNING id_reporte,
                          TO_CHAR(fecha, 'DD/MM/YYYY'),
                          TO_CHAR(fecha_creacion, 'DD/MM/YYYY')
                """;

        Object[] r = (Object[]) em.createNativeQuery(sql)
                .setParameter("iac",   idAulaCurso)
                .setParameter("ia",    req.getIdAlumno())
                .setParameter("tipo",  req.getTipo())
                .setParameter("titulo", req.getTitulo().trim())
                .setParameter("desc",  req.getDescripcion())
                .setParameter("fecha", req.getFecha())
                .setParameter("vis",   req.isVisiblePadre())
                .getSingleResult();

        return new ReporteDto(
                ((Number) r[0]).longValue(),
                req.getTipo(),
                req.getTitulo().trim(),
                req.getDescripcion(),
                (String) r[1],
                req.isVisiblePadre(),
                (String) r[2]
        );
    }

    // ────────────────────────────────────────────────────────
    // Eliminar reporte
    // ────────────────────────────────────────────────────────
    @Transactional
    public void eliminarReporte(long idReporte, String codigoDocente) {
        String sql = """
                DELETE FROM reportes_alumno r
                WHERE r.id_reporte = :id
                  AND r.id_aula_curso IN (
                      SELECT da.id_aula_curso
                      FROM docente_asignaciones da
                      JOIN maestros m ON m.id_maestro = da.id_maestro
                      JOIN usuarios u ON u.id_usuario = m.id_usuario
                      WHERE u.codigo = :codigo AND da.activo = true
                  )
                """;
        int rows = em.createNativeQuery(sql)
                .setParameter("id",     idReporte)
                .setParameter("codigo", codigoDocente)
                .executeUpdate();
        if (rows == 0)
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Reporte no encontrado o no autorizado");
    }

    // ────────────────────────────────────────────────────────
    // Toggle visibilidad padre
    // ────────────────────────────────────────────────────────
    @Transactional
    public ReporteDto toggleVisibilidad(long idReporte, String codigoDocente) {
        /* Verificar autorización y obtener estado actual */
        String check = """
                SELECT r.visible_padre FROM reportes_alumno r
                JOIN aula_cursos ac ON ac.id_aula_curso = r.id_aula_curso
                JOIN docente_asignaciones da ON da.id_aula_curso = ac.id_aula_curso
                JOIN maestros  m ON m.id_maestro = da.id_maestro
                JOIN usuarios  u ON u.id_usuario = m.id_usuario
                WHERE r.id_reporte = :id AND u.codigo = :codigo AND da.activo = true
                """;
        List<?> result = em.createNativeQuery(check)
                .setParameter("id",     idReporte)
                .setParameter("codigo", codigoDocente)
                .getResultList();
        if (result.isEmpty())
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");

        boolean nuevoEstado = !((Boolean) result.get(0));

        String upd = "UPDATE reportes_alumno SET visible_padre = :vis WHERE id_reporte = :id";
        em.createNativeQuery(upd)
                .setParameter("vis", nuevoEstado)
                .setParameter("id",  idReporte)
                .executeUpdate();

        String fetch = """
                SELECT r.id_reporte, r.tipo, r.titulo, r.descripcion,
                       TO_CHAR(r.fecha, 'DD/MM/YYYY'),
                       r.visible_padre,
                       TO_CHAR(r.fecha_creacion, 'DD/MM/YYYY')
                FROM reportes_alumno r WHERE r.id_reporte = :id
                """;
        Object[] r = (Object[]) em.createNativeQuery(fetch)
                .setParameter("id", idReporte)
                .getSingleResult();
        return new ReporteDto(
                ((Number) r[0]).longValue(),
                (String)  r[1],
                (String)  r[2],
                (String)  r[3],
                (String)  r[4],
                (Boolean) r[5],
                (String)  r[6]
        );
    }

    // ────────────────────────────────────────────────────────
    private void verificarAutorizacion(long idAulaCurso, String codigoDocente) {
        String sql = """
                SELECT COUNT(*) FROM docente_asignaciones da
                JOIN maestros m ON m.id_maestro = da.id_maestro
                JOIN usuarios u ON u.id_usuario = m.id_usuario
                WHERE da.id_aula_curso = :iac AND u.codigo = :codigo AND da.activo = true
                """;
        Number cnt = (Number) em.createNativeQuery(sql)
                .setParameter("iac",    idAulaCurso)
                .setParameter("codigo", codigoDocente)
                .getSingleResult();
        if (cnt.longValue() == 0)
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
    }
}
