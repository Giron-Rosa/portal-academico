package pe.sanagustin.portal.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
public class N8nWebhookService {

    @Value("${n8n.webhook-url}")
    private String webhookUrl;

    @Value("${n8n.test-email}")
    private String testEmail;

    @Value("${n8n.entorno}")
    private String entorno;

    @jakarta.persistence.PersistenceContext
    private jakarta.persistence.EntityManager em;

    private final RestTemplate restTemplate = new RestTemplate();

    @Async
    public void enviarAlerta(String tipoAlerta, String alumnoCodigo, String alumnoNombre,
                             String padreNombre, String padreEmail, String cursoNombre, String detalleAlerta) {
        
        // Si estamos en desarrollo, redirigir el correo al correo de pruebas
        String emailDestino = padreEmail;
        if ("desarrollo".equalsIgnoreCase(entorno)) {
            log.info("[n8n Webhook] Redirigiendo correo del padre {} ({}) al correo de pruebas {}", 
                    padreNombre, padreEmail, testEmail);
            emailDestino = testEmail;
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("tipoAlerta", tipoAlerta);
        payload.put("alumnoCodigo", alumnoCodigo);
        payload.put("alumnoNombre", alumnoNombre);
        payload.put("padreNombre", padreNombre);
        payload.put("padreEmail", emailDestino);
        payload.put("cursoNombre", cursoNombre);
        payload.put("detalleAlerta", detalleAlerta);
        payload.put("fecha", LocalDate.now().toString());

        try {
            log.info("[n8n Webhook] Enviando payload a {}: {}", webhookUrl, payload);
            restTemplate.postForEntity(webhookUrl, payload, String.class);
            log.info("[n8n Webhook] Envío exitoso.");
        } catch (Exception e) {
            log.error("[n8n Webhook] Error al enviar a n8n: {}", e.getMessage());
        }
    }

    public void procesarAlertaNota(long idAlumno, Double nota, String cursoNombre, String evaluacionTitulo) {
        if (nota == null || nota >= 11.0) {
            return; // Solo alertamos notas bajas desaprobadas (< 11.0)
        }

        try {
            String sql = """
                SELECT 
                    al.nombre AS al_nom, al.apellido AS al_ape, u_al.codigo AS al_cod,
                    pa.nombre AS pa_nom, pa.apellido AS pa_ape, u_pa.email AS pa_email
                FROM alumnos al
                JOIN usuarios u_al ON u_al.id_usuario = al.id_usuario
                LEFT JOIN padre_hijo ph ON ph.id_alumno = al.id_alumno
                LEFT JOIN padres pa ON pa.id_padre = ph.id_padre
                LEFT JOIN usuarios u_pa ON u_pa.id_usuario = pa.id_usuario
                WHERE al.id_alumno = :idAlumno
                """;

            @SuppressWarnings("unchecked")
            java.util.List<Object[]> rows = em.createNativeQuery(sql)
                    .setParameter("idAlumno", idAlumno)
                    .getResultList();

            for (Object[] r : rows) {
                String alNom = r[0] + " " + r[1];
                String alCod = (String) r[2];
                String paNom = r[3] != null ? r[3] + " " + r[4] : "Padre/Madre";
                String paEmail = r[5] != null ? (String) r[5] : null;

                if (paEmail != null) {
                    String detalle = "Nota desaprobada de " + nota + " obtenida en la evaluación: " + evaluacionTitulo;
                    enviarAlerta("BAJA_NOTA", alCod, alNom, paNom, paEmail, cursoNombre, detalle);
                }
            }
        } catch (Exception e) {
            log.error("Error al procesar alerta de nota baja para idAlumno " + idAlumno, e);
        }
    }

    public void procesarAlertaAsistencia(long idAlumno, String fecha, String estado, String justificante, long idAulaCurso) {
        if ("presente".equalsIgnoreCase(estado)) {
            return; // Solo alertamos inasistencias (falta), tardanzas o justificados por salud
        }

        try {
            // Obtener el nombre del curso
            String cursoSql = """
                SELECT c.nombre 
                FROM aula_cursos ac
                JOIN cursos c ON c.id_curso = ac.id_curso
                WHERE ac.id_aula_curso = :idAulaCurso
                """;
            String cursoNombre = (String) em.createNativeQuery(cursoSql)
                    .setParameter("idAulaCurso", idAulaCurso)
                    .getSingleResult();

            String sql = """
                SELECT 
                    al.nombre AS al_nom, al.apellido AS al_ape, u_al.codigo AS al_cod,
                    pa.nombre AS pa_nom, pa.apellido AS pa_ape, u_pa.email AS pa_email
                FROM alumnos al
                JOIN usuarios u_al ON u_al.id_usuario = al.id_usuario
                LEFT JOIN padre_hijo ph ON ph.id_alumno = al.id_alumno
                LEFT JOIN padres pa ON pa.id_padre = ph.id_padre
                LEFT JOIN usuarios u_pa ON u_pa.id_usuario = pa.id_usuario
                WHERE al.id_alumno = :idAlumno
                """;

            @SuppressWarnings("unchecked")
            java.util.List<Object[]> rows = em.createNativeQuery(sql)
                    .setParameter("idAlumno", idAlumno)
                    .getResultList();

            for (Object[] r : rows) {
                String alNom = r[0] + " " + r[1];
                String alCod = (String) r[2];
                String paNom = r[3] != null ? r[3] + " " + r[4] : "Padre/Madre";
                String paEmail = r[5] != null ? (String) r[5] : null;

                if (paEmail != null) {
                    String tipoAlerta = "INASISTENCIA";
                    String detalle = "El alumno registró " + estado.toUpperCase() + " en la fecha: " + fecha;
                    if (justificante != null && !justificante.trim().isEmpty()) {
                        detalle += ". Motivo: " + justificante;
                        String justLower = justificante.toLowerCase();
                        if (justLower.contains("salud") || justLower.contains("enferm") || justLower.contains("medic") || justLower.contains("gripe") || justLower.contains("doctor")) {
                            tipoAlerta = "SALUD";
                        }
                    }
                    enviarAlerta(tipoAlerta, alCod, alNom, paNom, paEmail, cursoNombre, detalle);
                }
            }
        } catch (Exception e) {
            log.error("Error al procesar alerta de asistencia para idAlumno " + idAlumno, e);
        }
    }

    public void enviarBoletinExcel() {
        String urlBase = webhookUrl.substring(0, webhookUrl.lastIndexOf("/") + 1);
        String urlBoletin = urlBase + "boletin-excel";
        try {
            log.info("[n8n Webhook] Disparando boletín excel a {}", urlBoletin);
            restTemplate.postForEntity(urlBoletin, new HashMap<>(), String.class);
            log.info("[n8n Webhook] Boletín disparado exitosamente.");
        } catch (Exception e) {
            log.error("[n8n Webhook] Error al disparar boletín: {}", e.getMessage());
            throw new RuntimeException("Error al disparar n8n: " + e.getMessage(), e);
        }
    }
}
