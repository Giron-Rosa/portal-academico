package pe.sanagustin.portal.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.Map;

@Service
public class OpenAiService {

    @Value("${openai.api.key}")
    private String apiKey;

    @Value("${openai.api.url}")
    private String apiUrl;

    @Value("${openai.api.model}")
    private String apiModel;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public String llamarOpenAi(String systemPrompt, String userPrompt, boolean forceJson) {
        try {
            java.util.Map<String, Object> requestBody = new java.util.HashMap<>(Map.of(
                "model", apiModel,
                "messages", List.of(
                    Map.of("role", "system", "content", systemPrompt),
                    Map.of("role", "user", "content", userPrompt)
                ),
                "temperature", 0.7
            ));

            if (forceJson) {
                requestBody.put("response_format", Map.of("type", "json_object"));
            }

            String requestBodyJson = objectMapper.writeValueAsString(requestBody);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(apiUrl))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(requestBodyJson))
                    .timeout(Duration.ofSeconds(60))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                Map<?, ?> responseMap = objectMapper.readValue(response.body(), Map.class);
                List<?> choices = (List<?>) responseMap.get("choices");
                if (choices != null && !choices.isEmpty()) {
                    Map<?, ?> firstChoice = (Map<?, ?>) choices.getFirst();
                    Map<?, ?> message = (Map<?, ?>) firstChoice.get("message");
                    return (String) message.get("content");
                }
            } else if (response.statusCode() == 429) {
                return "ERROR_LIMIT: El servicio de IA está saturado actualmente debido a que muchos alumnos del salón están usando la misma API Key en este momento. Por favor, intenta de nuevo en unos minutos.";
            } else if (response.statusCode() == 401 || response.statusCode() == 403) {
                return "ERROR_AUTH: La API Key provista por el docente no tiene saldo suficiente o ha sido desactivada. Comunícate con el profesor.";
            } else {
                System.err.println("Error no esperado de OpenAI (" + response.statusCode() + "): " + response.body());
                return "ERROR_API: OpenAI respondió con un código de error " + response.statusCode() + ". Inténtalo más tarde.";
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return "ERROR_CONEXION: Ocurrió un error inesperado al conectar con el servidor de IA de OpenAI. Revisa los logs del servidor.";
    }
}
