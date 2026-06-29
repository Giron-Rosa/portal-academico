package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import pe.sanagustin.portal.dto.AsistenciaAlumnoDto;
import pe.sanagustin.portal.dto.GuardarAsistenciaRequest;
import pe.sanagustin.portal.dto.SesionAsistenciaDto;

import java.util.List;

import pe.sanagustin.portal.dto.ConsolidadoMensualDto;
import pe.sanagustin.portal.dto.AlumnoConsolidadoDto;
import java.util.ArrayList;
import java.util.Map;
import java.util.HashMap;

@Service
@RequiredArgsConstructor
public class AsistenciaService {

    private final EntityManager em;

    // ────────────────────────────────────────────────────────
    // Obtener sesión de asistencia para una fecha
    // Si no existen registros, los devuelve con estado "presente" (sin persistir)
    // ────────────────────────────────────────────────────────
    public SesionAsistenciaDto getSesion(long idAulaCurso, String fecha, String codigoDocente) {
        verificarAutorizacion(idAulaCurso, codigoDocente);

        String sql = """
                SELECT
                    a.id_asistencia,
                    al.id_alumno,
                    u.codigo,
                    al.apellido || ' ' || al.nombre AS nombres,
                    COALESCE(a.estado, 'presente')  AS estado,
                    a.justificante
                FROM matriculas  m
                JOIN aula_cursos ac ON ac.id_aula  = m.id_aula
                JOIN alumnos     al ON al.id_alumno = m.id_alumno
                JOIN usuarios    u  ON u.id_usuario = al.id_usuario
                LEFT JOIN asistencia_alumno a
                       ON a.id_alumno   = al.id_alumno
                      AND a.id_aula_curso = ac.id_aula_curso
                      AND a.fecha       = CAST(:fecha AS DATE)
                WHERE ac.id_aula_curso = :iac AND m.estado = 'activa'
                ORDER BY al.apellido, al.nombre
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("iac",   idAulaCurso)
                .setParameter("fecha", fecha)
                .getResultList();

        List<AsistenciaAlumnoDto> alumnos = rows.stream().map(r -> new AsistenciaAlumnoDto(
                r[0] != null ? ((Number) r[0]).longValue() : null,
                ((Number) r[1]).longValue(),
                (String) r[2],
                (String) r[3],
                (String) r[4],
                (String) r[5]
        )).toList();

        long presentes    = alumnos.stream().filter(a -> "presente"    .equals(a.estado())).count();
        long faltas       = alumnos.stream().filter(a -> "falta"       .equals(a.estado())).count();
        long tardanzas    = alumnos.stream().filter(a -> "tardanza"    .equals(a.estado())).count();
        long justificados = alumnos.stream().filter(a -> "justificado" .equals(a.estado())).count();

        return new SesionAsistenciaDto(
                fecha,
                (int) presentes,
                (int) faltas,
                (int) tardanzas,
                (int) justificados,
                alumnos
        );
    }

    // ────────────────────────────────────────────────────────
    // Guardar (upsert) todos los registros de una sesión
    // ────────────────────────────────────────────────────────
    @Transactional
    public SesionAsistenciaDto guardarSesion(long idAulaCurso,
                                             GuardarAsistenciaRequest req,
                                             String codigoDocente) {
        verificarAutorizacion(idAulaCurso, codigoDocente);

        String upsert = """
                INSERT INTO asistencia_alumno (id_aula_curso, id_alumno, fecha, estado, justificante)
                VALUES (:iac, :ia, CAST(:fecha AS DATE), :estado, :just)
                ON CONFLICT (id_aula_curso, id_alumno, fecha)
                DO UPDATE SET estado = EXCLUDED.estado,
                              justificante = EXCLUDED.justificante,
                              fecha_registro = NOW()
                """;

        for (GuardarAsistenciaRequest.RegistroAlumno ra : req.getAlumnos()) {
            em.createNativeQuery(upsert)
                    .setParameter("iac",   idAulaCurso)
                    .setParameter("ia",    ra.getIdAlumno())
                    .setParameter("fecha", req.getFecha())
                    .setParameter("estado", ra.getEstado())
                    .setParameter("just",   ra.getJustificante())
                    .executeUpdate();
        }

        return getSesion(idAulaCurso, req.getFecha(), codigoDocente);
    }

    // ────────────────────────────────────────────────────────
    // Obtener fechas que ya tienen sesión registrada
    // ────────────────────────────────────────────────────────
    public List<String> getFechasConSesion(long idAulaCurso, String codigoDocente) {
        verificarAutorizacion(idAulaCurso, codigoDocente);

        String sql = """
                SELECT DISTINCT TO_CHAR(a.fecha, 'YYYY-MM-DD')
                FROM asistencia_alumno a
                WHERE a.id_aula_curso = :iac
                ORDER BY 1 DESC
                LIMIT 60
                """;

        @SuppressWarnings("unchecked")
        List<String> result = em.createNativeQuery(sql)
                .setParameter("iac", idAulaCurso)
                .getResultList();
        return result;
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

    public ConsolidadoMensualDto getConsolidado(long idAulaCurso, String mesYYYYMM, String codigoDocente) {
        verificarAutorizacion(idAulaCurso, codigoDocente);

        // 1. Fechas únicas en ese mes
        String fechasSql = """
                SELECT DISTINCT TO_CHAR(a.fecha, 'YYYY-MM-DD')
                FROM asistencia_alumno a
                WHERE a.id_aula_curso = :iac
                  AND TO_CHAR(a.fecha, 'YYYY-MM') = :mes
                ORDER BY 1 ASC
                """;

        @SuppressWarnings("unchecked")
        List<String> fechas = em.createNativeQuery(fechasSql)
                .setParameter("iac", idAulaCurso)
                .setParameter("mes", mesYYYYMM)
                .getResultList();

        // 2. Todos los alumnos activos en este curso
        String alumnosSql = """
                SELECT al.id_alumno, u.codigo, al.apellido || ' ' || al.nombre AS nombres
                FROM matriculas m
                JOIN alumnos al ON al.id_alumno = m.id_alumno
                JOIN usuarios u ON u.id_usuario = al.id_usuario
                WHERE m.id_aula = (SELECT id_aula FROM aula_cursos WHERE id_aula_curso = :iac)
                  AND m.estado = 'activa'
                ORDER BY al.apellido, al.nombre
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rowsAlumnos = em.createNativeQuery(alumnosSql)
                .setParameter("iac", idAulaCurso)
                .getResultList();

        List<AlumnoConsolidadoDto> consolidados = new ArrayList<>();

        if (fechas.isEmpty()) {
            for (Object[] r : rowsAlumnos) {
                consolidados.add(new AlumnoConsolidadoDto(
                        ((Number) r[0]).longValue(),
                        (String) r[1],
                        (String) r[2],
                        false,
                        100,
                        new ArrayList<>()
                ));
            }
            return new ConsolidadoMensualDto(fechas, consolidados);
        }

        // 3. Asistencias de este mes
        String asisSql = """
                SELECT a.id_alumno, TO_CHAR(a.fecha, 'YYYY-MM-DD'), a.estado
                FROM asistencia_alumno a
                WHERE a.id_aula_curso = :iac
                  AND TO_CHAR(a.fecha, 'YYYY-MM') = :mes
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rowsAsis = em.createNativeQuery(asisSql)
                .setParameter("iac", idAulaCurso)
                .setParameter("mes", mesYYYYMM)
                .getResultList();

        Map<Long, Map<String, String>> mapaAsis = new HashMap<>();
        for (Object[] r : rowsAsis) {
            long idA = ((Number) r[0]).longValue();
            String f = (String) r[1];
            String e = (String) r[2];
            mapaAsis.computeIfAbsent(idA, k -> new HashMap<>()).put(f, e);
        }

        for (Object[] r : rowsAlumnos) {
            long idA = ((Number) r[0]).longValue();
            String codigo = (String) r[1];
            String nombres = (String) r[2];

            Map<String, String> asisAlumno = mapaAsis.getOrDefault(idA, new HashMap<>());
            List<String> estados = new ArrayList<>();
            int countAsistidos = 0;
            int total = fechas.size();

            for (String f : fechas) {
                String e = asisAlumno.getOrDefault(f, "presente"); // si no hay asume presente
                estados.add(e);
                if ("presente".equals(e) || "tardanza".equals(e) || "justificado".equals(e)) {
                    countAsistidos++;
                }
            }

            int pct = total == 0 ? 100 : (int) Math.round((countAsistidos * 100.0) / total);
            boolean alertaRiesgo = pct < 70;

            consolidados.add(new AlumnoConsolidadoDto(idA, codigo, nombres, alertaRiesgo, pct, estados));
        }

        return new ConsolidadoMensualDto(fechas, consolidados);
    }
}
