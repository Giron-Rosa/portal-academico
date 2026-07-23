import { Component, inject, signal, computed, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { PadreService } from '../../services/padre.service';
import { PadInicio } from './sections/pad-inicio/pad-inicio';
import { PadCursos } from './sections/pad-cursos/pad-cursos';
import { PadAsistencia } from './sections/pad-asistencia/pad-asistencia';
import { PadMensajes } from './sections/pad-mensajes/pad-mensajes';
import { PadEventos } from './sections/pad-eventos/pad-eventos';
import { PadPagos } from './sections/pad-pagos/pad-pagos';
import { PadGamificacion } from './sections/pad-gamificacion/pad-gamificacion';


import type {
  SeccionPadre as Seccion,
  VistaPadre as Vista,
  EstadoAlumno as Estado,
  CursoDetalle,
  Hijo,
  CursoDetalleHijoApi as CursoDetalleApi,
  HijoApi,
  MensajeResumenPadre as MensajeResumen,
  RespuestaPadre as RespuestaResumen,
  MensajeDetallePadre as MensajeDetalle,
  DocenteDisponible,
  TareaHijo,
  ExamenHijo,
  CursoDetalleCompleto,
  AsistenciaRegistroPadre as AsistenciaRegistro,
  AsistenciaDetalleCompleto,
  EventoHijo,
  PagoHijo
} from '../../shared/models/padre.models';


@Component({
  selector: 'app-portal-padre',
  imports: [CommonModule, FormsModule, PadInicio, PadCursos, PadAsistencia, PadMensajes, PadEventos, PadPagos, PadGamificacion],
  templateUrl: './portal-padre.html',
  styleUrl: './portal-padre.scss',
})
export class PortalPadre implements OnDestroy {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private padreService = inject(PadreService);
  readonly ws    = inject(WebSocketService);
  private zone   = inject(NgZone);

  // Variables para notas de voz (audio)
  grabando = signal(false);
  duracionGrabacion = signal(0);
  mediaRecorder: any = null;
  audioChunks: Blob[] = [];
  recordingInterval: any = null;

  // Plus Ultra: dictado por voz nativo
  dictando = signal(false);
  recognition: any = null;

  seccionActiva  = signal<Seccion>('inicio');
  vista          = signal<Vista>('dashboard');
  hijoIdx        = signal<number>(0);
  menuUsuario    = signal(false);
  cargando       = signal(false);
  errorCarga     = signal('');

  /* ── Signals para la sección de Mensajes ── */
  mensajes              = signal<MensajeResumen[]>([]);
  mensajeActivo         = signal<MensajeDetalle | null>(null);
  respuestasActivas     = signal<RespuestaResumen[]>([]);
  replyText             = signal<string>('');
  cargandoMensajes      = signal<boolean>(false);
  errorMensajes         = signal<string>('');
  cargandoDetalleChat   = signal<boolean>(false);
  enviandoReply         = signal<boolean>(false);
  refinandoConIA        = signal<boolean>(false);

  // Paginación de respuestas (Infinite scroll hacia arriba)
  currentPage           = signal<number>(0);
  hasMorePages          = signal<boolean>(true);
  cargandoMasRespuestas = signal<boolean>(false);

  // Nuevo chat modal
  modalNuevoChat        = signal<boolean>(false);
  docentesDisponibles   = signal<DocenteDisponible[]>([]);
  nuevoChatAlumnoSel    = signal<Hijo | null>(null);
  nuevoChatDocenteSel   = signal<DocenteDisponible | null>(null);
  nuevoChatAsunto       = signal<string>('');
  nuevoChatMensaje      = signal<string>('');
  enviandoNuevoChat     = signal<boolean>(false);

  /* ── Fase 2: Señales de Cursos ── */
  cursosHijo            = signal<CursoDetalleCompleto[]>([]);
  cargandoCursos        = signal<boolean>(false);
  errorCursos           = signal<string>('');
  cursoExpandido        = signal<number>(-1); // índice del curso expandido (-1 = ninguno)
  tabCurso              = signal<'tareas' | 'examenes'>('tareas'); // tab activa en el detalle

  /* ── Fase 3: Señales de Asistencia ── */
  asistenciaHijo        = signal<AsistenciaDetalleCompleto | null>(null);
  cargandoAsistencia    = signal<boolean>(false);
  errorAsistencia       = signal<string>('');

  /* ── Fase 4: Señales de Eventos ── */
  eventosHijo           = signal<EventoHijo[]>([]);
  cargandoEventos       = signal<boolean>(false);
  errorEventos          = signal<string>('');

  horarioHijo           = signal<any[]>([]);
  cargandoHorario       = signal<boolean>(false);
  errorHorario          = signal<string>('');

  /* ── Fase 4: Señales de Pagos ── */
  pagosHijo             = signal<PagoHijo[]>([]);
  cargandoPagos         = signal<boolean>(false);
  errorPagos            = signal<string>('');
  modalProximamentePago = signal<boolean>(false);

  nombrePadre    = this.auth.getNombre() ?? 'Padre';
  codigoPadre    = this.auth.getCodigo() ?? '';

  get inicialesP(): string {
    return this.nombrePadre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  navItems: { id: Seccion; label: string; icon: string }[] = [
    { id: 'inicio',     label: 'Inicio',     icon: 'home'    },
    { id: 'cursos',     label: 'Cursos',     icon: 'book'    },
    { id: 'asistencia', label: 'Asistencia', icon: 'check'   },
    { id: 'mensajes',   label: 'Mensajes',   icon: 'message' },
    { id: 'eventos',    label: 'Eventos',    icon: 'calendar'},
    { id: 'pagos',      label: 'Pagos',      icon: 'card'    },
    { id: 'metas',      label: 'Mi Meta Académica', icon: 'award'   },
  ];

  hijos = signal<Hijo[]>([]);

  hijosEnRiesgo = computed(() => this.hijos().filter(h => h.estado === 'riesgo').length);

  hijoActual = computed(() => this.hijos()[this.hijoIdx()]);

  misionesSemanalesSignal = signal<any[]>([]);
  insigniasObtenidasSignal = signal<any[]>([]);

  misionesSemanales = computed(() => this.misionesSemanalesSignal());
  insigniasObtenidas = computed(() => this.insigniasObtenidasSignal());

  progresoMisionesGeneral = computed(() => {
    const mis = this.misionesSemanales();
    if (!mis.length) return 0;
    const comp = mis.filter(m => m.completado).length;
    return Math.round((comp / mis.length) * 100);
  });

  constructor() {
    this.cargarResumen();
    // Conectar WebSocket para notificaciones de mensajes en tiempo real
    this.ws.connect();
  }

  ngOnDestroy(): void {
    this.ws.disconnect();
  }

  private cargarResumen() {
    this.cargando.set(true);

    this.padreService.getResumenHijos()
      .subscribe({
        next: (data) => {
          this.hijos.set(data.map((h, i) => this.mapHijo(h, i)));
          this.cargando.set(false);
          // Si el usuario ya está en una sección que necesita datos, cargarlos ahora que hijos están disponibles
          this.cargarDatosSeccionActual();
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar la información de los estudiantes.');
          this.cargando.set(false);
        },
      });
  }

  /** Carga los datos de la sección activa para el hijo actual (se llama al cambiar sección o cuando hijos terminan de cargar) */
  private cargarDatosSeccionActual(): void {
    const s    = this.seccionActiva();
    const hijo = this.hijoActual();
    if (!hijo) return;

    if (s === 'cursos')     this.cargarCursos(hijo.codigo);
    else if (s === 'asistencia') this.cargarAsistencia(hijo.codigo);
    else if (s === 'eventos')    this.cargarEventos(hijo.codigo);
    else if (s === 'pagos')      this.cargarPagos(hijo.codigo);
    else if (s === 'metas')      this.cargarGamificacion(hijo.codigo);
    else if (s === 'mensajes')   this.cargarMensajes();
  }

  private mapHijo(h: HijoApi, idx: number): Hijo {
    const cursos: CursoDetalle[] = h.cursos.map(c => ({
      nombre:           c.nombre,
      progreso:         c.progreso,
      tareasEntregadas: c.tareasEntregadas,
      totalTareas:      c.totalTareas,
      puntualidad:      c.asistenciaCurso,
      docente:          c.docente,
      promedioCurso:    c.promedioCurso,
    }));

    return {
      id:            idx + 1,
      nombre:        `${h.nombre} ${h.apellido}`,
      grado:         `${h.grado} · Sec. ${h.seccion}`,
      codigo:        h.codigo,
      estado:        h.estado,
      promedio:      h.promedio,
      asistencia:    h.asistencia,
      cursosRiesgo:  h.cursosRiesgo,
      entregaTareas: h.entregaTareas,
      cuotasPendientes: h.cuotasPendientes,
      descripcion:   `Período ${h.periodo} · Turno ${h.turno}.`,
      cursosMonitor: cursos.slice(0, 3).map(c => ({ nombre: c.nombre, progreso: c.progreso })),
      cursos,
      eventos:       [],
      parentesco:    h.parentesco,
    };
  }

  setSeccion(s: Seccion) {
    this.seccionActiva.set(s);
    // Siempre resetear la vista a dashboard (incluyendo 'inicio', para que al volver de un detalle no quede en blanco)
    this.vista.set('dashboard');
    if (s === 'mensajes') {
      this.ws.marcarLeidas();
    } else {
      this.ws.unsubscribeFromChat();
    }
    // Intentar cargar datos; si hijos aún no han cargado, cargarDatosSeccionActual() lo volverá a hacer al terminar cargarResumen()
    this.cargarDatosSeccionActual();
  }

  verDetalle(idx: number) {
    this.hijoIdx.set(idx);
    const hijo = this.hijos()[idx];
    if (hijo) {
      this.cargarEventos(hijo.codigo);
      this.cargarHorarioHijo(hijo.codigo);
      this.cargarGamificacion(hijo.codigo);
    }
    this.vista.set('detalle');
  }

  cargarHorarioHijo(codigoAlumno: string): void {
    this.cargandoHorario.set(true);
    this.errorHorario.set('');
    this.padreService.getHorarioHijo(codigoAlumno).subscribe({
      next: (data) => {
        this.horarioHijo.set(data);
        this.cargandoHorario.set(false);
      },
      error: () => {
        this.errorHorario.set('No se pudo cargar el horario del estudiante.');
        this.cargandoHorario.set(false);
      }
    });
  }

  volverDashboard() {
    this.vista.set('dashboard');
  }

  /* ════════════════════════════════════════════════
     FASE 2 — Cursos del hijo
  ════════════════════════════════════════════════ */

  cargarCursos(codigoAlumno: string): void {
    this.cargandoCursos.set(true);
    this.errorCursos.set('');
    this.cursoExpandido.set(-1);
    this.padreService.getCursosHijo(codigoAlumno).subscribe({
      next: (data) => {
        this.cursosHijo.set(data);
        this.cargandoCursos.set(false);
      },
      error: () => {
        this.errorCursos.set('No se pudieron cargar los cursos.');
        this.cargandoCursos.set(false);
      },
    });
  }

  toggleCursoExpandido(idx: number): void {
    this.cursoExpandido.update(prev => prev === idx ? -1 : idx);
    this.tabCurso.set('tareas');
  }

  cambiarHijoCursos(idx: number): void {
    this.hijoIdx.set(idx);
    const hijo = this.hijos()[idx];
    if (hijo) this.cargarCursos(hijo.codigo);
  }

  /* ════════════════════════════════════════════════
     FASE 3 — Asistencia del hijo
  ════════════════════════════════════════════════ */

  cargarAsistencia(codigoAlumno: string): void {
    this.cargandoAsistencia.set(true);
    this.errorAsistencia.set('');
    this.padreService.getAsistenciaHijo(codigoAlumno).subscribe({
      next: (data) => {
        this.asistenciaHijo.set(data);
        this.cargandoAsistencia.set(false);
      },
      error: () => {
        this.errorAsistencia.set('No se pudo cargar el historial de asistencia.');
        this.cargandoAsistencia.set(false);
      },
    });
  }

  cambiarHijoAsistencia(idx: number): void {
    this.hijoIdx.set(idx);
    const hijo = this.hijos()[idx];
    if (hijo) this.cargarAsistencia(hijo.codigo);
  }

  getEstadoAsistenciaLabel(est: string): string {
    const e = est.toLowerCase();
    if (e === 'presente') return 'Presente';
    if (e === 'tardanza') return 'Tardanza';
    if (e === 'falta' || e === 'falto') return 'Inasistencia';
    if (e === 'justificado') return 'Justificado';
    return est;
  }

  /* ════════════════════════════════════════════════
     FASE 4 — Eventos y Pagos del hijo
  ════════════════════════════════════════════════ */

  cargarEventos(codigoAlumno: string): void {
    this.cargandoEventos.set(true);
    this.errorEventos.set('');
    this.padreService.getEventosHijo(codigoAlumno).subscribe({
      next: (data) => {
        this.eventosHijo.set(data);
        this.cargandoEventos.set(false);
      },
      error: () => {
        this.errorEventos.set('No se pudieron cargar los eventos del aula.');
        this.cargandoEventos.set(false);
      },
    });
  }

  cambiarHijoEventos(idx: number): void {
    this.hijoIdx.set(idx);
    const hijo = this.hijos()[idx];
    if (hijo) this.cargarEventos(hijo.codigo);
  }

  cargarPagos(codigoAlumno: string): void {
    this.cargandoPagos.set(true);
    this.errorPagos.set('');
    this.padreService.getPagosHijo(codigoAlumno).subscribe({
      next: (data) => {
        this.pagosHijo.set(data);
        this.cargandoPagos.set(false);
      },
      error: () => {
        this.errorPagos.set('No se pudo cargar el estado de pensiones.');
        this.cargandoPagos.set(false);
      },
    });
  }

  cambiarHijoPagos(idx: number): void {
    this.hijoIdx.set(idx);
    const hijo = this.hijos()[idx];
    if (hijo) this.cargarPagos(hijo.codigo);
  }

  pagandoConcepto = signal<string | null>(null);

  simularPago(pago: PagoHijo): void {
    const hijo = this.hijoActual();
    if (!hijo) return;

    this.pagandoConcepto.set(pago.concepto);

    this.padreService.procesarPago({ codigoAlumno: hijo.codigo, concepto: pago.concepto }).subscribe({
      next: () => {
        this.pagandoConcepto.set(null);
        this.cargarPagos(hijo.codigo);
        this.cargarResumen();
        alert('¡Pago de cuota simulado con éxito! Se ha registrado en la base de datos.');
      },
      error: (err) => {
        this.pagandoConcepto.set(null);
        console.error('Error al procesar pago', err);
        alert('Hubo un error al procesar el pago. Por favor, inténtelo nuevamente.');
      }
    });
  }

  cargarGamificacion(codigoAlumno: string): void {
    this.padreService.getGamificacionHijo(codigoAlumno).subscribe({
      next: (data) => {
        this.misionesSemanalesSignal.set(data.misiones);
        this.insigniasObtenidasSignal.set(data.insignias);
      },
      error: (err) => {
        console.error('Error al cargar gamificación', err);
      }
    });
  }

  abrirModalProximamentePago(): void {
    this.modalProximamentePago.set(true);
  }

  cerrarModalProximamentePago(): void {
    this.modalProximamentePago.set(false);
  }

  getBadgeEventoIcon(tipo: string): string {
    const t = tipo.toLowerCase();
    if (t === 'examen') return '📝';
    if (t === 'actividad') return '🏆';
    if (t === 'reunion_padres') return '👥';
    if (t === 'paseo') return '🚌';
    if (t === 'dia_festivo') return '🎉';
    return '📢';
  }

  getBadgeEventoLabel(tipo: string): string {
    const t = tipo.toLowerCase();
    if (t === 'examen') return 'Examen';
    if (t === 'actividad') return 'Actividad';
    if (t === 'reunion_padres') return 'Reunión';
    if (t === 'paseo') return 'Paseo';
    if (t === 'dia_festivo') return 'Festivo';
    return 'General';
  }



  getNotaColor(nota: number | null, max: number): string {
    if (nota === null) return '#94a3b8';
    const pct = (nota / max) * 100;
    if (pct >= 80) return '#22c55e';
    if (pct >= 60) return '#eab308';
    return '#c1121f';
  }

  getBarColor(p: number): string {
    if (p >= 80) return '#22c55e';
    if (p >= 60) return '#eab308';
    return '#c1121f';
  }

  getEstadoLabel(e: Estado): string {
    return e === 'bueno' ? 'Bueno' : e === 'observacion' ? 'En observación' : 'En riesgo';
  }

  getDesempeno(p: number): string {
    if (p >= 80) return 'Excelente';
    if (p >= 60) return 'Regular';
    return 'Necesita mejorar';
  }

  getClase(dia: number, hora: string): any {
    return this.horarioHijo().find(h => h.dia === dia && h.horaInicio === hora);
  }

  toggleMenuUsuario() { this.menuUsuario.update(v => !v); }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  /* ════════════════════════════════════════════════
     MENSAJES — Sección completa del portal del padre
  ════════════════════════════════════════════════ */

  cargarMensajes(): void {
    this.cargandoMensajes.set(true);
    this.errorMensajes.set('');
    this.padreService.getMensajes().subscribe({
      next: (data) => { this.mensajes.set(data); this.cargandoMensajes.set(false); },
      error: () => { this.errorMensajes.set('No se pudieron cargar los mensajes.'); this.cargandoMensajes.set(false); },
    });
  }

  noLeidosPadre = () => this.mensajes().filter(m => !m.leido).length;

  abrirChat(id: number): void {
    // Resetear estado de paginación y respuestas
    this.mensajeActivo.set(null);
    this.respuestasActivas.set([]);
    this.currentPage.set(0);
    this.hasMorePages.set(true);
    this.cargandoDetalleChat.set(true);

    this.padreService.getMensajeDetalle(id).subscribe({
      next: (data) => {
        this.mensajeActivo.set(data);
        // Cargar las respuestas de la primera página (10 más recientes)
        this.cargarPaginaRespuestas(id, 0, true);
        // Suscribir al chat room de WebSocket
        this.ws.subscribeToChat(id, (resp: RespuestaResumen) => {
          this.zone.run(() => {
            this.respuestasActivas.update(rs => {
              if (rs.some(r => r.id === resp.id)) return rs;
              const filtrado = rs.filter(r => r.id > 0 && r.cuerpo !== resp.cuerpo);
              return [...filtrado, resp];
            });
            this.scrollToBottom();
          });
        });
        // Marcar como leído en la lista local
        this.mensajes.update(ms =>
          ms.map(m => m.id === id ? { ...m, leido: true } : m)
        );
        this.cargandoDetalleChat.set(false);
      },
      error: () => { this.cargandoDetalleChat.set(false); },
    });
  }

  private cargarPaginaRespuestas(idMensaje: number, page: number, reset = false): void {
    if (reset) { this.cargandoDetalleChat.set(true); }
    else        { this.cargandoMasRespuestas.set(true); }

    this.padreService.getRespuestasMensaje(idMensaje, page, 10).subscribe({
      next: (data) => {
        if (reset) {
          this.respuestasActivas.set(data);
        } else {
          // Anteponer mensajes más antiguos en la parte superior
          this.respuestasActivas.update(rs => [...data, ...rs]);
        }
        this.hasMorePages.set(data.length === 10);
        this.currentPage.set(page);
        this.cargandoDetalleChat.set(false);
        this.cargandoMasRespuestas.set(false);
      },
      error: () => {
        this.cargandoDetalleChat.set(false);
        this.cargandoMasRespuestas.set(false);
      },
    });
  }

  cargarMasRespuestas(): void {
    const activo = this.mensajeActivo();
    if (!activo || !this.hasMorePages() || this.cargandoMasRespuestas()) return;
    this.cargarPaginaRespuestas(activo.id, this.currentPage() + 1, false);
  }

  cerrarChat(): void {
    this.ws.unsubscribeFromChat();
    this.mensajeActivo.set(null);
    this.respuestasActivas.set([]);
    this.replyText.set('');
  }

  scrollToBottom() {
    setTimeout(() => {
      const container = document.getElementById('chat-scroll');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 50);
  }

  // Audio Playback Helpers
  playingAudio: any = null;
  activeAudioRespuesta: any = null;

  toggleAudioPlay(r: any) {
    const audioUrl = 'http://localhost:8080' + r.cuerpo.replace('[AUDIO]', '').trim();
    
    if (this.playingAudio && this.activeAudioRespuesta === r) {
      if (r.isPlaying) {
        this.playingAudio.pause();
        r.isPlaying = false;
      } else {
        this.playingAudio.play();
        r.isPlaying = true;
      }
      return;
    }

    if (this.playingAudio) {
      this.playingAudio.pause();
      if (this.activeAudioRespuesta) {
        this.activeAudioRespuesta.isPlaying = false;
      }
    }

    const audio = new Audio(audioUrl);
    this.playingAudio = audio;
    this.activeAudioRespuesta = r;
    r.isPlaying = true;
    r.currentTime = 0;
    r.audioProgress = 0;

    audio.addEventListener('timeupdate', () => {
      this.zone.run(() => {
        r.currentTime = audio.currentTime;
        r.duration = audio.duration || 0;
        r.audioProgress = (audio.currentTime / (audio.duration || 1)) * 100;
      });
    });

    audio.addEventListener('ended', () => {
      this.zone.run(() => {
        r.isPlaying = false;
        r.audioProgress = 0;
        r.currentTime = 0;
        this.playingAudio = null;
        this.activeAudioRespuesta = null;
      });
    });

    audio.play();
  }

  seekAudio(event: MouseEvent, r: any) {
    if (!this.playingAudio || this.activeAudioRespuesta !== r) return;
    const bar = event.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const duration = this.playingAudio.duration || 0;
    this.playingAudio.currentTime = percentage * duration;
  }

  formatAudioTime(seconds: number): string {
    if (isNaN(seconds) || seconds === Infinity) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // Audio Recording Methods
  iniciarGrabacion() {
    if (this.grabando()) return;
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      this.audioChunks = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      this.mediaRecorder = mediaRecorder;
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        this.enviarAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      this.grabando.set(true);
      this.duracionGrabacion.set(0);
      mediaRecorder.start();

      this.recordingInterval = setInterval(() => {
        this.duracionGrabacion.update(d => d + 1);
      }, 1000);
    }).catch(err => {
      console.error('No se pudo acceder al micrófono:', err);
      alert('Por favor, concede permisos de micrófono para grabar audios.');
    });
  }

  detenerGrabacion() {
    if (!this.grabando() || !this.mediaRecorder) return;
    this.mediaRecorder.stop();
    this.grabando.set(false);
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
  }

  cancelarGrabacion() {
    if (!this.grabando() || !this.mediaRecorder) return;
    this.mediaRecorder.onstop = () => {
      this.mediaRecorder = null;
      this.audioChunks = [];
    };
    this.mediaRecorder.stop();
    this.grabando.set(false);
    if (this.recordingInterval) {
      clearInterval(this.recordingInterval);
      this.recordingInterval = null;
    }
  }

  enviarAudio(audioBlob: Blob) {
    const activo = this.mensajeActivo();
    if (!activo) return;

    // Agregar mensaje optimista temporal
    const tempId = -Date.now();
    const tempResp: any = {
      id: tempId,
      cuerpo: '[AUDIO] /uploads/audios/temp.webm',
      fecha: 'Enviando...',
      autor: 'Yo',
      esMaestro: false,
      isPlaying: false,
      audioProgress: 0,
      currentTime: 0
    };

    this.respuestasActivas.update(rs => [...rs, tempResp]);
    this.scrollToBottom();

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');

    this.padreService.responderMensajeAudio(activo.id, formData)
      .subscribe({
        next: () => {
          // El WebSocket se encargará de remover el temporal y poner el real.
        },
        error: () => {
          // Remover el temporal si falla
          this.respuestasActivas.update(rs => rs.filter(r => r.id !== tempId));
          alert('Error al enviar nota de voz.');
        }
      });
  }

  toggleDictado() {
    if (this.dictando()) {
      if (this.recognition) {
        this.recognition.stop();
      }
      this.dictando.set(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta el reconocimiento de voz (dictado). Pruebe en Chrome, Edge o Safari.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'es-PE';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => {
      this.zone.run(() => {
        this.dictando.set(true);
      });
    };

    rec.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        this.zone.run(() => {
          const current = this.replyText();
          this.replyText.set(current ? (current + ' ' + finalTranscript).trim() : finalTranscript.trim());
        });
      }
    };

    rec.onerror = (ev: any) => {
      console.error('Error en dictado de voz:', ev);
      this.zone.run(() => {
        if (ev.error === 'not-allowed') {
          alert('Permiso de micrófono denegado para el dictado.\nHabilítalo en la configuración del navegador (ícono del candado en la barra de direcciones).');
        } else if (ev.error === 'network') {
          alert('Error de red en el dictado por voz:\n\nEl navegador no puede conectar con los servidores de reconocimiento de voz (Google/Microsoft).\n\n1. Si usas Brave: Habilita el reconocimiento de voz de Google en Brave (Configuración -> Privacidad y seguridad -> Usar los servicios de voz de Google).\n2. Si estás en una red escolar/corporativa: Es posible que los puertos del servicio de dictado de Google estén bloqueados por el firewall.');
        } else {
          alert(`Error en dictado de voz (${ev.error}). Revisa la configuración del micrófono.`);
        }
        this.dictando.set(false);
      });
    };

    rec.onend = () => {
      this.zone.run(() => {
        this.dictando.set(false);
      });
    };

    this.recognition = rec;
    rec.start();
  }
  enviarRespuesta(): void {
    const activo = this.mensajeActivo();
    const texto  = this.replyText().trim();
    if (!activo || !texto || this.enviandoReply()) return;

    // Agregar de forma optimista localmente de inmediato
    const tempId = -Date.now();
    const tempResp: RespuestaResumen = {
      id: tempId,
      cuerpo: texto,
      fecha: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) + ' 🕒',
      autor: 'Yo',
      esMaestro: false
    };

    this.respuestasActivas.update(rs => [...rs, tempResp]);
    this.scrollToBottom();
    this.replyText.set('');

    this.enviandoReply.set(true);
    this.padreService.responderMensaje(activo.id, { cuerpo: texto }).subscribe({
      next: () => {
        this.enviandoReply.set(false);
      },
      error: () => {
        this.enviandoReply.set(false);
        this.respuestasActivas.update(rs => rs.filter(r => r.id !== tempId));
        alert('No se pudo enviar el mensaje.');
      },
    });
  }

  refinarMensajeConIA(tipo: 'respuesta' | 'nuevo'): void {
    const texto = tipo === 'respuesta' ? this.replyText().trim() : this.nuevoChatMensaje().trim();
    if (!texto || this.refinandoConIA()) return;

    this.refinandoConIA.set(true);

    let nombreAlumno = 'mi hijo(a)';
    let nombreDestinatario = 'Profesor(a)';
    let relacion = 'Apoderado';

    const hijo = this.hijoActual();
    if (hijo) {
      nombreAlumno = hijo.nombre || 'mi hijo(a)';
      relacion = hijo.parentesco || 'Apoderado';
    }

    if (tipo === 'respuesta') {
      const activo = this.mensajeActivo();
      if (activo) {
        nombreAlumno = activo.nombreAlumno || nombreAlumno;
        nombreDestinatario = activo.nombrePadre || 'Profesor(a)'; // nombrePadre es el nombre del profesor en la bandeja del padre
      }
    } else {
      const sel = this.nuevoChatDocenteSel();
      if (sel) {
        nombreAlumno = sel.nombreAlumno || nombreAlumno;
        nombreDestinatario = sel.nombreMaestro || 'Profesor(a)';
      }
    }

    this.padreService.refinarRespuestaIA({ 
      texto,
      nombreAlumno,
      nombreDestinatario,
      relacion
    }).subscribe({
      next: (res) => {
        if (tipo === 'respuesta') {
          this.replyText.set(res.resultado);
        } else {
          this.nuevoChatMensaje.set(res.resultado);
        }
        this.refinandoConIA.set(false);
      },
      error: () => {
        this.refinandoConIA.set(false);
        alert('No se pudo refinar el mensaje con IA. Por favor, inténtelo más tarde.');
      }
    });
  }


  abrirNuevoChat(): void {
    this.padreService.getDocentesDisponibles().subscribe({
      next: (data) => {
        this.docentesDisponibles.set(data);
        this.nuevoChatAsunto.set('');
        this.nuevoChatMensaje.set('');
        this.nuevoChatDocenteSel.set(null);
        this.modalNuevoChat.set(true);
      },
    });
  }

  cerrarNuevoChat(): void { this.modalNuevoChat.set(false); }

  enviarNuevoChat(): void {
    const docente = this.nuevoChatDocenteSel();
    const asunto  = this.nuevoChatAsunto().trim();
    const cuerpo  = this.nuevoChatMensaje().trim();
    if (!docente || !asunto || !cuerpo || this.enviandoNuevoChat()) return;

    this.enviandoNuevoChat.set(true);
    this.padreService.crearNuevoMensaje({
      idAlumno:    docente.idAlumno,
      idPadre:     0, // el backend lo infiere del token
      idAulaCurso: docente.idAulaCurso,
      asunto,
      cuerpo,
    }).subscribe({
      next: (resp) => {
        this.enviandoNuevoChat.set(false);
        this.modalNuevoChat.set(false);
        this.cargarMensajes();
        // Abrir el chat recién creado
        this.abrirChat(resp.id);
      },
      error: () => { this.enviandoNuevoChat.set(false); },
    });
  }

  enviarNuevoChatDeComponent(event: { docente: any, asunto: string, cuerpo: string }) {
    this.nuevoChatDocenteSel.set(event.docente);
    this.nuevoChatAsunto.set(event.asunto);
    this.nuevoChatMensaje.set(event.cuerpo);
    this.enviarNuevoChat();
  }

  enviarRespuestaDeComponent(texto: string) {
    this.replyText.set(texto);
    this.enviarRespuesta();
  }
}

