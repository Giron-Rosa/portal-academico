package pe.sanagustin.portal.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.sanagustin.portal.service.BiService;
import pe.sanagustin.portal.service.OpenAiService;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class IaController {

    private final OpenAiService openAiService;
    private final BiService biService;

    // ── IDEA 1: Plan de Apoyo Pedagógico (Docente) ──
    @GetMapping("/api/portal/docente/predicciones/{idAlumno}/ia-advisory")
    public ResponseEntity<Map<String, String>> obtenerRecomendaciones(
            @PathVariable Integer idAlumno,
            @RequestParam double asistencia,
            @RequestParam double promedio,
            @RequestParam String causas) {

        String systemPrompt = "Eres un psicopedagogo y asesor educativo del Colegio San Agustín. Tu labor es proponer planes de apoyo realistas.";
        String userPrompt = String.format(
            "Propón un plan de acción pedagógico concreto de 3 puntos breves para el alumno(a) de ID %d.\n" +
            "Métricas actuales:\n" +
            "- Asistencia: %.1f%%\n" +
            "- Promedio Académico: %.1f/20\n" +
            "- Alertas: %s\n\n" +
            "Escribe la sugerencia en español de manera formal y resumida (usa viñetas).",
            idAlumno, asistencia, promedio, causas
        );

        String consejo = openAiService.llamarOpenAi(systemPrompt, userPrompt);
        return ResponseEntity.ok(Map.of("resultado", consejo));
    }

    // ── IDEA 2: Asistente de Mensajería (Docente & Padre) ──
    @PostMapping("/api/portal/docente/mensajes/ia-redactar")
    public ResponseEntity<Map<String, String>> redactarComoDocente(@RequestBody Map<String, String> body) {
        String borrador = body.getOrDefault("texto", "");
        String systemPrompt = "Eres un docente profesional y respetuoso del Colegio San Agustín. Tu deber es redactar o pulir mensajes formales dirigidos a padres de familia.";
        String userPrompt = "Reescribe el siguiente borrador de manera formal, clara y con excelente ortografía:\n\n" + borrador;

        String redactado = openAiService.llamarOpenAi(systemPrompt, userPrompt);
        return ResponseEntity.ok(Map.of("resultado", redactado));
    }

    @PostMapping("/api/portal/padre/mensajes/ia-redactar")
    public ResponseEntity<Map<String, String>> redactarComoPadre(@RequestBody Map<String, String> body) {
        String borrador = body.getOrDefault("texto", "");
        String systemPrompt = "Eres un padre/madre de familia del Colegio San Agustín. Tu deber es redactar o pulir justificaciones o consultas formales dirigidas a los profesores de tus hijos.";
        String userPrompt = "Reescribe el siguiente borrador de manera muy educada, clara y formal:\n\n" + borrador;

        String redactado = openAiService.llamarOpenAi(systemPrompt, userPrompt);
        return ResponseEntity.ok(Map.of("resultado", redactado));
    }

    // ── IDEA 3: Resumen Ejecutivo del BI Escolar (Admin) ──
    @GetMapping("/api/admin/bi/ia-analisis")
    public ResponseEntity<Map<String, String>> analizarBiEscolar() {
        var promedioGrados = biService.getPromedioPorGrado();
        var asistenciaMes = biService.getAsistenciaInstitucional();
        var morosidad = biService.getRankingMorosos();

        String systemPrompt = "Eres un analista de gestión escolar y asesor de dirección del Colegio San Agustín.";
        String userPrompt = String.format(
            "Analiza las siguientes estadísticas institucionales y genera un resumen ejecutivo breve " +
            "destacando los 2 puntos más críticos y 2 recomendaciones estratégicas:\n\n" +
            "1. Promedio general por grados: %s\n" +
            "2. Asistencia mensual promedio: %s\n" +
            "3. Ranking de Deudas de Pensión por concepto: %s\n\n" +
            "Genera tu análisis estructurado en español usando formato Markdown.",
            promedioGrados.toString(), asistenciaMes.toString(), morosidad.toString()
        );

        String analisis = openAiService.llamarOpenAi(systemPrompt, userPrompt);
        return ResponseEntity.ok(Map.of("resultado", analisis));
    }
}
