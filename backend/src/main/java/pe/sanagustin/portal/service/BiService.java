package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class BiService {

    @PersistenceContext
    private EntityManager em;

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getPromedioPorGrado() {
        String sql = """
                SELECT g.nombre AS grado,
                       COALESCE(ROUND(AVG(nt.nota)::numeric, 1), 0.0) AS promedio
                FROM alumnos al
                JOIN matriculas m ON m.id_alumno = al.id_alumno AND m.estado = 'activa'
                JOIN aulas au ON au.id_aula = m.id_aula
                JOIN grados g ON g.id_grado = au.id_grado
                LEFT JOIN notas_tarea nt ON nt.id_alumno = al.id_alumno AND nt.entregado = true AND nt.nota IS NOT NULL
                GROUP BY g.nombre, g.orden
                ORDER BY g.orden
                """;
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();
        List<Map<String, Object>> list = new ArrayList<>();
        for (Object[] r : rows) {
            list.add(Map.of(
                    "grado", r[0],
                    "promedio", ((Number) r[1]).doubleValue()
            ));
        }
        return list;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getDistribucionNotas() {
        String sql = """
                SELECT CASE 
                         WHEN nota < 11 THEN '0-10'
                         WHEN nota BETWEEN 11 AND 13 THEN '11-13'
                         WHEN nota BETWEEN 14 AND 16 THEN '14-16'
                         ELSE '17-20'
                       END AS rango,
                       COUNT(*) AS cantidad
                FROM notas_tarea
                WHERE entregado = true AND nota IS NOT NULL
                GROUP BY rango
                """;
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();
        List<Map<String, Object>> list = new ArrayList<>();
        
        // Inicializar rangos por defecto para asegurar que siempre haya info en el gráfico
        Map<String, Long> map = new HashMap<>();
        map.put("0-10", 0L);
        map.put("11-13", 0L);
        map.put("14-16", 0L);
        map.put("17-20", 0L);

        for (Object[] r : rows) {
            String rango = (String) r[0];
            Long cantidad = ((Number) r[1]).longValue();
            map.put(rango, cantidad);
        }

        map.forEach((k, v) -> list.add(Map.of("rango", k, "cantidad", v)));
        return list;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getAsistenciaInstitucional() {
        String sql = """
                SELECT TO_CHAR(fecha, 'YYYY-MM') AS mes,
                       ROUND(COUNT(CASE WHEN estado IN ('presente', 'tardanza', 'justificado') THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0), 1) AS porcentaje
                FROM asistencia_alumno
                GROUP BY mes
                ORDER BY mes
                """;
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();
        List<Map<String, Object>> list = new ArrayList<>();
        for (Object[] r : rows) {
            list.add(Map.of(
                    "mes", r[0],
                    "porcentaje", r[1] != null ? ((Number) r[1]).doubleValue() : 100.0
            ));
        }
        return list;
    }

    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getRankingMorosos() {
        String sql = """
                SELECT cp.nombre AS concepto,
                       COUNT(*) AS deudores,
                       SUM(cp.monto) AS total_deuda
                FROM cuotas_estudiante ce
                JOIN conceptos_pago cp ON cp.id_concepto = ce.id_concepto
                WHERE ce.pagado = false AND ce.fecha_vencimiento < CURRENT_DATE
                GROUP BY cp.nombre
                ORDER BY total_deuda DESC
                """;
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();
        List<Map<String, Object>> list = new ArrayList<>();
        for (Object[] r : rows) {
            list.add(Map.of(
                    "concepto", r[0],
                    "deudores", ((Number) r[1]).longValue(),
                    "totalDeuda", ((Number) r[2]).doubleValue()
            ));
        }
        return list;
    }
}
