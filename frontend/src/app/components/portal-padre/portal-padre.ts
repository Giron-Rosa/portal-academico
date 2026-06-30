import { Component, inject, signal, computed, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';

type Seccion = 'inicio' | 'cursos' | 'asistencia' | 'mensajes' | 'eventos' | 'pagos';
type Vista   = 'dashboard' | 'detalle';
type Estado  = 'bueno' | 'observacion' | 'riesgo';

interface CursoDetalle {
  nombre: string;
  progreso: number;
  tareasEntregadas: number;
  totalTareas: number;
  puntualidad: number;
  docente?: string;
  promedioCurso: number;
}

interface Hijo {
  id: number;
  nombre: string;
  grado: string;
  codigo: string;
  estado: Estado;
  promedio: number;
  asistencia: number;
  cursosRiesgo: number;
  entregaTareas: number;
  cuotasPendientes: number;
  descripcion: string;
  cursosMonitor: { nombre: string; progreso: number }[];
  cursos: CursoDetalle[];
  eventos: string[];
}

interface CursoDetalleApi {
  nombre: string;
  area: string;
  horasSemana: number;
  docente: string;
  progreso: number;
  tareasEntregadas: number;
  totalTareas: number;
  promedioCurso: number;
  asistenciaCurso: number;
}

interface HijoApi {
  nombre: string;
  apellido: string;
  codigo: string;
  grado: string;
  seccion: string;
  turno: string;
  periodo: string;
  parentesco: string;
  promedio: number;
  asistencia: number;
  cursosRiesgo: number;
  entregaTareas: number;
  estado: Estado;
  cuotasPendientes: number;
  cursos: CursoDetalleApi[];
}

export interface MensajeResumen {
  id: number;
  asunto: string;
  tipo: string;
  leido: boolean;
  fechaEnvio: string;
  nombrePadre: string; // docente en el portal de padres
  nombreAlumno: string;
  idAlumno: number;
  grado: string;
  seccion: string;
  curso: string;
  cantRespuestas: number;
  ultimaRespuesta: string;
}

export interface RespuestaResumen {
  id: number;
  cuerpo: string;
  fecha: string;
  autor: string;
  esMaestro: boolean;
}

export interface MensajeDetalle {
  id: number;
  asunto: string;
  tipo: string;
  leido: boolean;
  fechaEnvio: string;
  nombrePadre: string; // docente en el portal de padres
  nombreAlumno: string;
  idAlumno: number;
  grado: string;
  seccion: string;
  curso: string;
  cuerpo: string;
  respuestas: RespuestaResumen[];
  iniciadoPorDocente: boolean;
}

export interface DocenteDisponible {
  idMaestro: number;
  nombreMaestro: string;
  curso: string;
  nombreAlumno: string;
  idAlumno: number;
  idAulaCurso: number;
}

/* ── Fase 2: Cursos ── */
export interface TareaHijo {
  idTarea: number;
  titulo: string;
  fechaEntrega: string;
  entregado: boolean;
  nota: number | null;
  notaMaxima: number;
}

export interface ExamenHijo {
  idExamen: number;
  titulo: string;
  tipo: string;
  fechaExamen: string;
  asistio: boolean;
  nota: number | null;
  notaMaxima: number;
}

export interface CursoDetalleCompleto {
  nombre: string;
  area: string;
  docente: string;
  progreso: number;
  tareasEntregadas: number;
  totalTareas: number;
  promedioCurso: number;
  asistenciaCurso: number;
  tareas: TareaHijo[];
  examenes: ExamenHijo[];
}

/* ── Fase 3: Asistencia ── */
export interface AsistenciaRegistro {
  fecha: string;
  estado: string;
  curso: string;
  justificante: string;
}

export interface AsistenciaDetalleCompleto {
  historial: AsistenciaRegistro[];
  total: number;
  presente: number;
  tardanza: number;
  falta: number;
  justificado: number;
  porcentaje: number;
}

/* ── Fase 4: Eventos y Pagos ── */
export interface EventoHijo {
  id: number;
  titulo: string;
  descripcion: string;
  tipo: string;
  fechaEvento: string;
  horaEvento: string;
  fechaCreacion: string;
  docente: string;
}

export interface PagoHijo {
  concepto: string;
  monto: number;
  fechaVencimiento: string;
  estado: string; // 'PAGADO', 'PENDIENTE', 'VENCIDO'
  fechaPago: string | null;
  documento: string | null;
}

@Component({
  selector: 'app-portal-padre',
  imports: [CommonModule, FormsModule],
  templateUrl: './portal-padre.html',
  styleUrl: './portal-padre.scss',
})
export class PortalPadre implements OnDestroy {
  private auth   = inject(AuthService);
  private router = inject(Router);
  private http   = inject(HttpClient);
  readonly ws    = inject(WebSocketService);

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
  ];

  hijos = signal<Hijo[]>([]);

  hijosEnRiesgo = computed(() => this.hijos().filter(h => h.estado === 'riesgo').length);

  hijoActual = computed(() => this.hijos()[this.hijoIdx()]);

  constructor() {
    this.cargarResumen();
    // Conectar WebSocket para notificaciones de mensajes en tiempo real
    this.ws.connect();
  }

  ngOnDestroy(): void {
    this.ws.disconnect();
  }

  private cargarResumen() {
    const token = this.auth.getToken();
    if (!token) return;

    this.cargando.set(true);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<HijoApi[]>('http://localhost:8080/api/portal/padre/resumen', { headers })
      .subscribe({
        next: (data) => {
          this.hijos.set(data.map((h, i) => this.mapHijo(h, i)));
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar la información de los estudiantes.');
          this.cargando.set(false);
        },
      });
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
    };
  }

  setSeccion(s: Seccion) {
    this.seccionActiva.set(s);
    if (s !== 'inicio') this.vista.set('dashboard');
    if (s === 'mensajes') {
      this.cargarMensajes();
      this.ws.marcarLeidas();
    } else {
      this.ws.unsubscribeFromChat();
    }
    if (s === 'cursos') {
      const hijo = this.hijoActual();
      if (hijo) this.cargarCursos(hijo.codigo);
    }
    if (s === 'asistencia') {
      const hijo = this.hijoActual();
      if (hijo) this.cargarAsistencia(hijo.codigo);
    }
    if (s === 'eventos') {
      const hijo = this.hijoActual();
      if (hijo) this.cargarEventos(hijo.codigo);
    }
    if (s === 'pagos') {
      const hijo = this.hijoActual();
      if (hijo) this.cargarPagos(hijo.codigo);
    }
  }

  verDetalle(idx: number) {
    this.hijoIdx.set(idx);
    const hijo = this.hijos()[idx];
    if (hijo) {
      this.cargarEventos(hijo.codigo);
      this.cargarHorarioHijo(hijo.codigo);
    }
    this.vista.set('detalle');
  }

  cargarHorarioHijo(codigoAlumno: string): void {
    this.cargandoHorario.set(true);
    this.errorHorario.set('');
    this.http.get<any[]>(
      `http://localhost:8080/api/portal/padre/horario/${codigoAlumno}`,
      { headers: this.headers() }
    ).subscribe({
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
    this.http.get<CursoDetalleCompleto[]>(
      `http://localhost:8080/api/portal/padre/cursos/${codigoAlumno}`,
      { headers: this.headers() }
    ).subscribe({
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
    this.http.get<AsistenciaDetalleCompleto>(
      `http://localhost:8080/api/portal/padre/asistencia/${codigoAlumno}`,
      { headers: this.headers() }
    ).subscribe({
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
    this.http.get<EventoHijo[]>(
      `http://localhost:8080/api/portal/padre/eventos/${codigoAlumno}`,
      { headers: this.headers() }
    ).subscribe({
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
    this.http.get<PagoHijo[]>(
      `http://localhost:8080/api/portal/padre/pagos/${codigoAlumno}`,
      { headers: this.headers() }
    ).subscribe({
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
    this.abrirModalProximamentePago();
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

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken() ?? ''}` });
  }

  cargarMensajes(): void {
    this.cargandoMensajes.set(true);
    this.errorMensajes.set('');
    this.http.get<MensajeResumen[]>(
      'http://localhost:8080/api/portal/padre/mensajes',
      { headers: this.headers() }
    ).subscribe({
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

    this.http.get<MensajeDetalle>(
      `http://localhost:8080/api/portal/padre/mensajes/${id}`,
      { headers: this.headers() }
    ).subscribe({
      next: (data) => {
        this.mensajeActivo.set(data);
        // Cargar las respuestas de la primera página (10 más recientes)
        this.cargarPaginaRespuestas(id, 0, true);
        // Suscribir al chat room de WebSocket
        this.ws.subscribeToChat(id, (resp: RespuestaResumen) => {
          this.respuestasActivas.update(rs => [...rs, resp]);
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

    this.http.get<RespuestaResumen[]>(
      `http://localhost:8080/api/portal/padre/mensajes/${idMensaje}/respuestas-paginadas`,
      { headers: this.headers(), params: { page: page.toString(), size: '10' } }
    ).subscribe({
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

  enviarRespuesta(): void {
    const activo = this.mensajeActivo();
    const texto  = this.replyText().trim();
    if (!activo || !texto || this.enviandoReply()) return;

    this.enviandoReply.set(true);
    this.http.post<void>(
      `http://localhost:8080/api/portal/padre/mensajes/${activo.id}/responder`,
      { cuerpo: texto },
      { headers: this.headers() }
    ).subscribe({
      next: () => {
        this.replyText.set('');
        this.enviandoReply.set(false);
        // El WS room traerá la respuesta automáticamente vía subscribeToChat
      },
      error: () => { this.enviandoReply.set(false); },
    });
  }

  abrirNuevoChat(): void {
    this.http.get<DocenteDisponible[]>(
      'http://localhost:8080/api/portal/padre/mensajes/docentes-disponibles',
      { headers: this.headers() }
    ).subscribe({
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
    this.http.post<{ id: number }>(
      'http://localhost:8080/api/portal/padre/mensajes/iniciar',
      {
        idAlumno:    docente.idAlumno,
        idPadre:     0, // el backend lo infiere del token
        idAulaCurso: docente.idAulaCurso,
        asunto,
        cuerpo,
      },
      { headers: this.headers() }
    ).subscribe({
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
}
