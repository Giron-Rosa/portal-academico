package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.service.BiService;
import pe.sanagustin.portal.service.OpenAiService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class IaController {

    private final OpenAiService openAiService;
    private final BiService biService;

    @PersistenceContext
    private EntityManager em;

    // ── IDEA 1: Plan de Apoyo Pedagógico (Docente) ──
    @GetMapping("/api/portal/docente/predicciones/{idAlumno}/ia-advisory")
    public ResponseEntity<Map<String, String>> obtenerRecomendaciones(
            @PathVariable Integer idAlumno,
            @RequestParam double asistencia,
            @RequestParam double promedio,
            @RequestParam String causas) {

        String nombreAlumno = "el estudiante";
        String gradoSeccion = "";
        try {
            var al = em.find(pe.sanagustin.portal.entity.Alumno.class, idAlumno.longValue());
            if (al != null) {
                nombreAlumno = al.getNombre() + " " + al.getApellido();
                gradoSeccion = al.getGrado() + " " + al.getSeccion();
            }
        } catch (Exception e) {
            // fallback
        }

        String systemPrompt = "Eres un psicopedagogo y asesor educativo del Colegio San Agustín. Propones planes de apoyo sumamente detallados, estructurados en HTML y centrados en el alumno.";
        String userPrompt = String.format(
            "Diseña un Plan de Apoyo Pedagógico integral, formal y muy detallado para el estudiante %s de %s.\n\n" +
            "Métricas actuales del estudiante:\n" +
            "- Porcentaje de Asistencia: %.1f%%\n" +
            "- Promedio General Acumulado: %.1f/20 (Nota aprobatoria mínima: 11)\n" +
            "- Alertas de riesgo detectadas: %s\n\n" +
            "Instrucciones para la respuesta:\n" +
            "1. Organiza la respuesta en 3 secciones principales: 'I. Diagnóstico de Riesgo', 'II. Plan de Acción Académica y Tutorías' y 'III. Recomendaciones para el Entorno Familiar'.\n" +
            "2. Proporciona recomendaciones específicas y realistas basadas en las alertas del estudiante.\n" +
            "3. IMPORTANTE: Genera la respuesta utilizando exclusivamente etiquetas HTML para dar formato (como <h3>, <p>, <ul>, <li>, <strong>, <br>). NO uses formato Markdown (como ** o *).",
            nombreAlumno, gradoSeccion, asistencia, promedio, causas
        );

        String consejo = openAiService.llamarOpenAi(systemPrompt, userPrompt);
        return ResponseEntity.ok(Map.of("resultado", consejo));
    }

    // ── IDEA 2: Asistente de Mensajería (Docente & Padre) ──
    @PostMapping("/api/portal/docente/mensajes/ia-redactar")
    public ResponseEntity<Map<String, String>> redactarComoDocente(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body) {
        String borrador = body.getOrDefault("texto", "");
        String nombreAlumno = body.getOrDefault("nombreAlumno", "el estudiante");
        String nombreDestinatario = body.getOrDefault("nombreDestinatario", "Apoderado");

        // Buscar el nombre del docente en la BD
        String codigoDocente = userDetails.getUsername();
        String nombreDocente = "Docente";
        try {
            var maestro = em.createQuery(
                "SELECT m FROM Maestro m WHERE m.usuario.codigo = :codigo", pe.sanagustin.portal.entity.Maestro.class)
                .setParameter("codigo", codigoDocente)
                .getSingleResult();
            nombreDocente = maestro.getNombre() + " " + maestro.getApellido();
        } catch (Exception e) {
            // fallback
        }

        String systemPrompt = "Eres un docente profesional y respetuoso del Colegio San Agustín. Reescribe el borrador de mensaje de manera clara, educada y formal en español.";
        String userPrompt = String.format(
            "Reescribe el siguiente borrador de mensaje para enviarlo al apoderado:\n" +
            "Borrador original: \"%s\"\n\n" +
            "Variables para rellenar (ÚSALAS directamente en el texto, no dejes marcadores de posición):\n" +
            "- Nombre del alumno(a): %s\n" +
            "- Nombre del apoderado(a) destinatario: %s\n" +
            "- Nombre del docente remitente: %s\n\n" +
            "Instrucciones de formato:\n" +
            "1. NO utilices formato Markdown (como ** o *) ni HTML. Debe ser texto plano.\n" +
            "2. No agregues datos de contacto (como teléfono o email) ya que se envía por chat.\n" +
            "3. Firma al final exactamente como:\n" +
            "Atentamente,\n\n" +
            "%s\n" +
            "Colegio San Agustín\n\n" +
            "4. No dejes campos entre corchetes como [Su Nombre] o [Su Cargo]. Utiliza los nombres provistos.",
            borrador, nombreAlumno, nombreDestinatario, nombreDocente, nombreDocente
        );

        String redactado = openAiService.llamarOpenAi(systemPrompt, userPrompt);
        return ResponseEntity.ok(Map.of("resultado", redactado));
    }

    @PostMapping("/api/portal/padre/mensajes/ia-redactar")
    public ResponseEntity<Map<String, String>> redactarComoPadre(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body) {
        String borrador = body.getOrDefault("texto", "");
        String nombreAlumno = body.getOrDefault("nombreAlumno", "mi hijo(a)");
        String nombreDestinatario = body.getOrDefault("nombreDestinatario", "Profesor(a)");
        String relacion = body.getOrDefault("relacion", "Apoderado");

        // Buscar el nombre del padre en la BD
        String codigoPadre = userDetails.getUsername();
        String nombrePadre = "Apoderado";
        try {
            var padre = em.createQuery(
                "SELECT p FROM Padre p WHERE p.usuario.codigo = :codigo", pe.sanagustin.portal.entity.Padre.class)
                .setParameter("codigo", codigoPadre)
                .getSingleResult();
            nombrePadre = padre.getNombre() + " " + padre.getApellido();
        } catch (Exception e) {
            // fallback
        }

        String systemPrompt = "Eres un padre/madre de familia del Colegio San Agustín. Reescribe el mensaje formal para el docente de tu hijo.";
        String userPrompt = String.format(
            "Reescribe el siguiente borrador de mensaje para enviarlo al profesor de tu hijo:\n" +
            "Borrador original: \"%s\"\n\n" +
            "Variables para rellenar (ÚSALAS directamente en el texto, no dejes marcadores de posición):\n" +
            "- Nombre de tu hijo(a) (alumno): %s\n" +
            "- Nombre del docente destinatario: %s\n" +
            "- Nombre del padre/madre remitente: %s\n" +
            "- Relación con el alumno (padre/madre/tutor): %s\n\n" +
            "Instrucciones de formato:\n" +
            "1. NO utilices formato Markdown (como ** o *) ni HTML. Debe ser texto plano.\n" +
            "2. No agregues datos de contacto (como teléfono o email) ya que se envía por chat.\n" +
            "3. Firma al final exactamente como:\n" +
            "Atentamente,\n\n" +
            "%s\n" +
            "%s de %s\n\n" +
            "4. No dejes campos entre corchetes. Utiliza los nombres provistos.",
            borrador, nombreAlumno, nombreDestinatario, nombrePadre, relacion, nombrePadre, relacion, nombreAlumno
        );

        String redactado = openAiService.llamarOpenAi(systemPrompt, userPrompt);
        return ResponseEntity.ok(Map.of("resultado", redactado));
    }

    // ── IDEA 3: Resumen Ejecutivo del BI Escolar (Admin) ──
    @GetMapping("/api/admin/bi/ia-analisis")
    public ResponseEntity<Map<String, String>> analizarBiEscolar() {
        var promedioGrados = biService.getPromedioPorGrado();
        var asistenciaMes = biService.getAsistenciaInstitucional();
        var morosidad = biService.getRankingMorosos();

        String systemPrompt = "Eres un consultor senior en gestión educativa y director estratégico de la red del Colegio San Agustín. Redactas informes gerenciales estructurados en HTML.";
        String userPrompt = String.format(
            "Elabora un Informe Analítico de Gestión Directiva de nivel ejecutivo a partir de las siguientes estadísticas de la institución:\n\n" +
            "1. Distribución de Calificaciones Promedio por Grado: %s\n" +
            "2. Historial Mensual de Asistencia Institucional: %s\n" +
            "3. Ranking de Morosidad Financiera por Concepto de Pago: %s\n\n" +
            "Instrucciones de formato e informe:\n" +
            "1. Organiza el reporte con los siguientes títulos: '<h2>Análisis de Desempeño y Gestión Escolar</h2>', '<h3>1. Situación Académica y Nivel Académico</h3>', '<h3>2. Monitoreo de Absentismo Escolar</h3>', '<h3>3. Salud Financiera y Cartera Vencida</h3>', '<h3>4. Plan de Acción Institucional y Recomendaciones</h3>'.\n" +
            "2. Sé analítico: señala anomalías (ej: grados con promedio 0.0 o bajas repentinas en la asistencia en meses específicos).\n" +
            "3. IMPORTANTE: La respuesta debe estar escrita usando exclusivamente etiquetas HTML (como <h2>, <h3>, <p>, <strong>, <ul>, <li>, <br>). NO uses formato Markdown (como ** o *).",
            promedioGrados.toString(), asistenciaMes.toString(), morosidad.toString()
        );

        String analisis = openAiService.llamarOpenAi(systemPrompt, userPrompt);
        return ResponseEntity.ok(Map.of("resultado", analisis));
    }
}
