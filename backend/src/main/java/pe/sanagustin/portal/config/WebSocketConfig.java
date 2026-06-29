package pe.sanagustin.portal.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

/**
 * Configura el broker STOMP sobre WebSocket con fallback SockJS.
 *
 * Endpoint de conexión : /ws (accesible desde el frontend)
 * Prefijo de mensajes  : /app  → mensajes enviados desde el cliente al servidor
 * Prefijo de topics    : /topic → mensajes broadcast del servidor al cliente
 * Prefijo de colas     : /queue → mensajes punto a punto (futuro uso)
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Habilita un broker en memoria para /topic y /queue
        config.enableSimpleBroker("/topic", "/queue");
        // Prefijo para las peticiones que van del cliente al servidor
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                // Permitir el origen del frontend Angular en desarrollo y producción
                .setAllowedOriginPatterns("http://localhost:4200", "http://127.0.0.1:4200")
                // SockJS es el fallback para navegadores que no soportan WebSocket nativo
                .withSockJS();
    }
}
