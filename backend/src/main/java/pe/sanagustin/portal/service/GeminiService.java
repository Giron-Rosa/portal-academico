package pe.sanagustin.portal.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class GeminiService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    private final RestClient restClient = RestClient.builder().build();

    public String analyzePdf(byte[] pdfBytes) {
        String base64Data = Base64.getEncoder().encodeToString(pdfBytes);

        String systemPrompt = "Eres un asistente de estudio experto para la escuela San Agustín. " +
                "Analiza el PDF proporcionado y devuelve una respuesta estructurada en formato JSON en español con la siguiente estructura exacta:\n" +
                "{\n" +
                "  \"summary\": \"Resumen conciso y estructurado del documento en formato Markdown\",\n" +
                "  \"studyTactics\": [\n" +
                "    {\n" +
                "      \"title\": \"Nombre de la técnica (ej. Método Cornell, Flashcards, Método Feynman, etc.)\",\n" +
                "      \"description\": \"Instrucción personalizada de cómo aplicar esta técnica a este tema en particular\"\n" +
                "    }\n" +
                "  ],\n" +
                "  \"questions\": [\n" +
                "    {\n" +
                "      \"questionText\": \"Pregunta de opción múltiple basada en el PDF\",\n" +
                "      \"options\": [\"Opción A\", \"Opción B\", \"Opción C\", \"Opción D\"],\n" +
                "      \"correctOptionIndex\": 0,\n" +
                "      \"explanation\": \"Explicación detallada de por qué la opción correcta es la seleccionada\"\n" +
                "    }\n" +
                "  ]\n" +
                "}\n" +
                "Asegúrate de generar al menos 4 preguntas de autoevaluación y 3 tácticas de estudio personalizadas.";

        Map<String, Object> inlineData = Map.of(
                "mimeType", "application/pdf",
                "data", base64Data
        );

        Map<String, Object> part1 = Map.of("inlineData", inlineData);
        Map<String, Object> part2 = Map.of("text", systemPrompt);

        Map<String, Object> content = Map.of("parts", List.of(part1, part2));

        Map<String, Object> generationConfig = Map.of(
                "responseMimeType", "application/json"
        );

        Map<String, Object> requestBody = Map.of(
                "contents", List.of(content),
                "generationConfig", generationConfig
        );

        return callGemini(requestBody);
    }

    public String chatWithPdf(byte[] pdfBytes, String question, List<Map<String, Object>> chatHistory) {
        String base64Data = Base64.getEncoder().encodeToString(pdfBytes);

        List<Map<String, Object>> contents = new ArrayList<>();

        // Add the PDF context in the first message content parts
        Map<String, Object> inlineData = Map.of(
                "mimeType", "application/pdf",
                "data", base64Data
        );
        Map<String, Object> pdfPart = Map.of("inlineData", inlineData);
        Map<String, Object> systemPart = Map.of("text", "El alumno está chateando contigo sobre este documento PDF. Responde sus preguntas de forma pedagógica, amigable y estructurada. Mantente estrictamente en el contexto del PDF.");

        contents.add(Map.of("role", "user", "parts", List.of(pdfPart, systemPart)));
        contents.add(Map.of("role", "model", "parts", List.of(Map.of("text", "Entendido. He leído el PDF y estoy listo para responder preguntas sobre su contenido."))));

        // Add history
        if (chatHistory != null) {
            for (Map<String, Object> message : chatHistory) {
                String role = (String) message.get("role"); // "user" or "model"
                String text = (String) message.get("text");
                contents.add(Map.of("role", role, "parts", List.of(Map.of("text", text))));
            }
        }

        // Add current question
        contents.add(Map.of("role", "user", "parts", List.of(Map.of("text", question))));

        Map<String, Object> requestBody = Map.of(
                "contents", contents
        );

        return callGemini(requestBody);
    }

    private String callGemini(Map<String, Object> requestBody) {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;

        try {
            Map<?, ?> response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(Map.class);

            if (response != null && response.containsKey("candidates")) {
                List<?> candidates = (List<?>) response.get("candidates");
                if (!candidates.isEmpty()) {
                    Map<?, ?> candidate = (Map<?, ?>) candidates.get(0);
                    Map<?, ?> contentResponse = (Map<?, ?>) candidate.get("content");
                    if (contentResponse != null) {
                        List<?> parts = (List<?>) contentResponse.get("parts");
                        if (parts != null && !parts.isEmpty()) {
                            Map<?, ?> part = (Map<?, ?>) parts.get(0);
                            return (String) part.get("text");
                        }
                    }
                }
            }
            throw new RuntimeException("Respuesta vacía o inválida de Gemini API");
        } catch (org.springframework.web.client.HttpStatusCodeException e) {
            throw new RuntimeException("Error en la llamada a la API de Gemini (" + e.getStatusCode() + "): " + e.getResponseBodyAsString(), e);
        } catch (Exception e) {
            throw new RuntimeException("Error en la llamada a la API de Gemini: " + e.getMessage(), e);
        }
    }
}
