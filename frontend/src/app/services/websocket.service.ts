import { Injectable, OnDestroy, signal, computed } from '@angular/core';
import { Client, IFrame, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthService } from './auth.service';

/** Payload de notificación recibido desde el backend */
export interface NotificacionWs {
  tipo:         string;  // 'NUEVO_MENSAJE' | 'NUEVA_RESPUESTA'
  idMensaje:    number;
  asunto:       string;
  remitente:    string;
  preview:      string;
  destinatario: string;
}

@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {

  private client: Client | null = null;
  private subscription: StompSubscription | null = null;
  private chatSubscription: StompSubscription | null = null;

  /** Signal con la última notificación recibida */
  ultimaNotificacion = signal<NotificacionWs | null>(null);

  /** Contador de notificaciones no vistas */
  contadorNoLeidas = signal<number>(0);

  /** Toast visible (para mostrar al usuario) */
  toastVisible = signal<boolean>(false);

  /** ¿Está conectado al broker? */
  conectado = signal<boolean>(false);

  constructor(private auth: AuthService) {}

  /**
   * Inicia la conexión STOMP sobre SockJS y se suscribe al topic personal del usuario.
   * Debe llamarse después de que el usuario se autenticó exitosamente.
   */
  connect(): void {
    if (this.client?.active) return; // Ya conectado

    const codigo = this.auth.getCodigo();
    if (!codigo) return;

    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,

      onConnect: (_frame: IFrame) => {
        this.conectado.set(true);
        // Suscribirse al topic personal del usuario autenticado
        this.subscription = this.client!.subscribe(
          `/topic/mensajes/${codigo}`,
          (msg: IMessage) => this.onMensajeRecibido(msg)
        );
      },

      onDisconnect: () => {
        this.conectado.set(false);
      },

      onStompError: (frame: IFrame) => {
        console.warn('[WS] Error STOMP:', frame.headers['message']);
        this.conectado.set(false);
      },
    });

    this.client.activate();
  }

  /** Detiene la conexión WebSocket */
  disconnect(): void {
    this.unsubscribeFromChat();
    this.subscription?.unsubscribe();
    this.client?.deactivate();
    this.conectado.set(false);
    this.subscription = null;
    this.client = null;
  }

  /** Se suscribe a una habitación de chat específica para recibir respuestas en vivo */
  subscribeToChat(idMensaje: number, callback: (msg: any) => void): void {
    this.unsubscribeFromChat();

    if (!this.client || !this.conectado()) {
      // Reintentar si no está conectado aún
      setTimeout(() => {
        if (this.conectado()) {
          this.subscribeToChat(idMensaje, callback);
        }
      }, 1000);
      return;
    }

    this.chatSubscription = this.client.subscribe(
      `/topic/chat/${idMensaje}`,
      (msg: IMessage) => {
        try {
          const payload = JSON.parse(msg.body);
          callback(payload);
        } catch {
          console.warn('[WS] Error al parsear mensaje de chat room:', msg.body);
        }
      }
    );
  }

  /** Se desuscribe de la habitación de chat activa */
  unsubscribeFromChat(): void {
    if (this.chatSubscription) {
      this.chatSubscription.unsubscribe();
      this.chatSubscription = null;
    }
  }

  /** Marca todas las notificaciones como vistas */
  marcarLeidas(): void {
    this.contadorNoLeidas.set(0);
  }

  /** Cierra el toast visible */
  cerrarToast(): void {
    this.toastVisible.set(false);
  }

  private onMensajeRecibido(msg: IMessage): void {
    try {
      const notif: NotificacionWs = JSON.parse(msg.body);
      this.ultimaNotificacion.set(notif);
      this.contadorNoLeidas.update(n => n + 1);

      // Mostrar toast automático y ocultarlo después de 5 s
      this.toastVisible.set(true);
      setTimeout(() => this.toastVisible.set(false), 5000);
    } catch {
      console.warn('[WS] Mensaje no parseable:', msg.body);
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
