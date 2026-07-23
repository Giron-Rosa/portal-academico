import { Component, inject, signal, computed, HostListener, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { DocenteService } from '../../services/docente.service';
import { PrediccionesDashboard } from './predicciones/predicciones-dashboard';
import { DocInicio } from './sections/doc-inicio/doc-inicio';
import { DocCursoDetalle } from './sections/doc-curso-detalle/doc-curso-detalle';
import { DocCalendario } from './sections/doc-calendario/doc-calendario';
import { DocMensajes } from './sections/doc-mensajes/doc-mensajes';
import { DocRefuerzos } from './sections/doc-refuerzos/doc-refuerzos';



import type {
  CursoDocente as Curso,
  CursoDocenteApi as CursoApi,
  MensajeResumenDocente as MensajeResumen,
  RespuestaDocente as RespuestaResumen,
  MensajeDetalleDocente as MensajeDetalle,
  AlumnoContexto,
  AlumnoDisponible,
  ClaseHorario,
  Reserva,
  FormReserva,
  EspacioReserva,
  PendienteDocente as Pendiente,
  AlertaCritica,
  MaterialDocente as Material,
  ClaseNodoDocente as ClaseNodo,
  SemanaNodoDocente as SemanaNodo,
  FormMaterial,
  TareaDocente as Tarea,
  NotaTarea,
  FormTarea,
  ExamenDocente as Examen,
  NotaExamen,
  FormExamen,
  UnidadDocente as Unidad,
  FormUnidad,
  ReporteDocente as Reporte,
  AlumnoReportes,
  FormReporte,
  AsistenciaAlumnoDocente as AsistenciaAlumno,
  AlumnoConsolidado,
  ConsolidadoMensual,
  SesionAsistencia,
  AulaSimple,
  TipoEvento,
  ComunicadoDocente as Comunicado,
  FormComunicado
} from '../../shared/models/docente.models';

/**
 * Paleta de colores para los bloques del calendario.
 * Se asigna una por curso usando el nombre en minúsculas como clave.
 */
const CURSO_COLORS: Record<string, string> = {
  'matemática':                     '#4361ee',
  'comunicación':                   '#ef476f',
  'ciencia y tecnología':           '#06d6a0',
  'historia, geografía y economía': '#f4a261',
  'inglés':                         '#7209b7',
  'arte y cultura':                 '#f72585',
  'educación física':               '#4cc9f0',
  'personal social':                '#2ec4b6',
  'religión':                       '#8d99ae',
};

/** Hora en la que empieza la grilla del calendario (7:00 AM) */
const CAL_HORA_INICIO = 7;
/** Hora en la que termina la grilla del calendario (15:00 = 3 PM) */
const CAL_HORA_FIN    = 15;
/** Píxeles que ocupa cada hora en la grilla vertical */
const CAL_PX_POR_HORA = 64;

const CARD_COLORS = ['#dce8f7', '#fde8e8', '#d5e5f5', '#fdd8d8', '#e8f0fc', '#fce8e8', '#e8f7ec', '#fef9e0'];

const ICON_MAP: Record<string, string> = {
  'matemática':                    'algebra',
  'comunicación':                  'comunica',
  'ciencia y tecnología':          'trigo',
  'historia, geografía y economía':'historia',
  'inglés':                        'geo',
  'arte y cultura':                'razon',
  'educación física':              'trigo',
  'personal social':               'historia',
  'religión':                      'razon',
};

@Component({
  selector: 'app-portal-docente',
  imports: [CommonModule, FormsModule, PrediccionesDashboard, DocInicio, DocCursoDetalle, DocCalendario, DocMensajes, DocRefuerzos],
  templateUrl: './portal-docente.html',
  styleUrl: './portal-docente.scss',
})
export class PortalDocente implements OnDestroy {
  private router = inject(Router);
  private auth   = inject(AuthService);
  private docenteService = inject(DocenteService);
  readonly ws    = inject(WebSocketService);
  private zone   = inject(NgZone);

  // Variables para notas de voz (audio)
  grabando = signal(false);
  duracionGrabacion = signal(0);
  mediaRecorder: any = null;
  audioChunks: Blob[] = [];
  recordingInterval: any = null;
  activeStream: MediaStream | null = null;
  isAudioCancelled = false;
  valoresFrecuencia = signal<number[]>(Array(24).fill(4));
  audioCtx: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  animationFrameId: any = null;

  // Plus Ultra: dictado por voz y copiloto empático
  dictando = signal(false);
  dictadoInterim = signal(''); // Texto provisional mientras se reconoce la voz
  recognition: any = null;
  sugiriendoRespuesta = signal(false);

  // Exponemos constantes usadas en el template
  calPxPorHora = CAL_PX_POR_HORA;
  today = new Date().toISOString().substring(0, 10);

  /** Espacios que el backend autoriza para este docente */
  espaciosDisponibles = signal<EspacioReserva[]>([]);

  /** Límite de tiempo (en horas y minutos) del espacio seleccionado en el modal */
  limiteTiempoSeleccionado = computed(() => {
    const nombre = this.formReserva().espacio;
    const espacio = this.espaciosDisponibles().find(e => e.nombre === nombre);
    if (!espacio) return null;
    const h = Math.floor(espacio.limiteMinutos / 60);
    const m = espacio.limiteMinutos % 60;
    return m === 0 ? `Límite: ${h} h` : `Límite: ${h} h ${m} min`;
  });

  activeSection = signal('inicio');
  activeGrade   = signal('Todos los Cursos');
  selectedYear  = signal('2026');
  dropdownOpen  = signal(false);
  cargando      = signal(false);
  errorCarga    = signal('');

  nombre    = this.auth.getNombre() ?? 'Docente';
  codigo    = this.auth.getCodigo() ?? '';
  iniciales = this.nombre.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();

  navItems = [
    { id: 'inicio',        label: 'Inicio'        },
    { id: 'calendario',    label: 'Calendario'    },
    { id: 'mensajes',      label: 'Mensajes'      },
    { id: 'refuerzos',     label: 'Refuerzos'     },
    { id: 'predicciones',  label: 'Predicciones'  },
  ];

  years = ['2024', '2025', '2026'];

  cursos       = signal<Curso[]>([]);
  pendientes       = signal<Pendiente[]>([]);
  alertasCriticas  = signal<AlertaCritica[]>([]);
  alertaSeleccionada = signal<AlertaCritica | null>(null);

  /* ── Signals de mensajería ── */

  /** Lista completa de mensajes recibidos del backend */
  mensajes           = signal<MensajeResumen[]>([]);
  /** Mensaje actualmente abierto en el panel de detalle */
  mensajeActivo      = signal<MensajeDetalle | null>(null);
  cargandoMensajes   = signal(false);
  errorMensajes      = signal('');
  /** Texto de búsqueda libre (padre, alumno o salón) */
  busquedaMsg        = signal('');
  /** Texto que el docente está escribiendo como respuesta */
  replyText          = signal('');
  enviandoReply      = signal(false);
  refinandoConIA     = signal(false);
  /** Panel contexto alumno: datos + estado de carga */
  contextoAlumno     = signal<AlumnoContexto | null>(null);
  cargandoContexto   = signal(false);
  mostrarContexto    = signal(false);

  /* ── Signals para "Nuevo Chat" ── */
  modalNuevoChat       = signal(false);
  alumnosDisponibles   = signal<AlumnoDisponible[]>([]);
  cargandoAlumnos      = signal(false);
  nuevoChatGrado       = signal('');
  nuevoChatSeccion     = signal('');
  nuevoChatBusqueda    = signal('');
  nuevoChatAlumnoSel   = signal<AlumnoDisponible | null>(null);
  nuevoChatAsunto      = signal('');
  nuevoChatMensaje     = signal('');
  enviandoNuevoChat    = signal(false);

  /** Grados únicos de alumnos disponibles para el modal nuevo chat */
  gradosDisponibles = computed(() =>
    [...new Set(this.alumnosDisponibles().map(a => a.grado))].sort()
  );

  /** Secciones únicas para el grado seleccionado */
  seccionesDisponibles = computed(() => {
    const g = this.nuevoChatGrado();
    const base = g
      ? this.alumnosDisponibles().filter(a => a.grado === g)
      : this.alumnosDisponibles();
    return [...new Set(base.map(a => a.seccion))].sort();
  });

  /** Alumnos filtrados por grado + sección + búsqueda libre en el modal */
  alumnosFiltradosModal = computed(() => {
    const g  = this.nuevoChatGrado();
    const s  = this.nuevoChatSeccion();
    const q  = this.nuevoChatBusqueda().toLowerCase().trim();
    return this.alumnosDisponibles().filter(a =>
      (!g || a.grado === g) &&
      (!s || a.seccion === s) &&
      (!q || a.nombreAlumno.toLowerCase().includes(q) ||
             a.nombrePadre.toLowerCase().includes(q))
    );
  });

  /** Grados únicos presentes en los mensajes, para los filtro-tabs */
  gradosMensajes = computed(() => {
    const grados = this.mensajes()
      .map(m => m.grado)
      .filter((g): g is string => !!g);
    return [...new Set(grados)];
  });

  /** Lista de mensajes filtrada por búsqueda libre */
  mensajesFiltrados = computed(() => {
    const q = this.busquedaMsg().toLowerCase().trim();
    if (!q) return this.mensajes();
    return this.mensajes().filter(m =>
      m.nombrePadre.toLowerCase().includes(q) ||
      (m.nombreAlumno ?? '').toLowerCase().includes(q) ||
      (m.grado ?? '').toLowerCase().includes(q) ||
      (m.seccion ?? '').toLowerCase().includes(q) ||
      m.asunto.toLowerCase().includes(q)
    );
  });

  /** Cantidad de mensajes no leídos (para el badge del sidebar) */
  noLeidos = computed(() => this.mensajes().filter(m => !m.leido).length);

  /* ── Signals de detalle de curso ── */

  /** Curso activo cuando el docente hace click en una card */
  cursoActivo      = signal<Curso | null>(null);
  /** Pestaña activa dentro del detalle del curso */
  activeSubTab     = signal('temario');  // 'temario' | 'asistencia' | 'contenido' | 'tareas' | 'examenes' | 'reportes'

  courseTabs = [
    { id: 'temario',    label: 'Temario' },
    { id: 'asistencia', label: 'Asistencia' },
    { id: 'contenido',  label: 'Contenido' },
    { id: 'tareas',     label: 'Tareas' },
    { id: 'examenes',   label: 'Exámenes' },
    { id: 'reportes',   label: 'Reportes' }
  ];

  /** Lista de materiales del curso activo */
  materiales       = signal<Material[]>([]);
  cargandoMat      = signal(false);
  /** Controla si el modal Subir Material está abierto */
  modalMaterial    = signal(false);
  enviandoMat      = signal(false);
  /** Estado del formulario del modal */
  formMaterial = signal<FormMaterial>({
    semana: 1, clase: 1, titulo: '', tipo: 'pdf', url: ''
  });
  /** Semanas/Clases abiertas en el acordeón de contenido */
  semanasAbiertas  = signal<Set<number>>(new Set([1]));
  clasesAbiertas   = signal<Set<string>>(new Set(['1-1']));

  /** Materiales agrupados por semana > clase para el árbol de contenido */
  contenidoArbol = computed<SemanaNodo[]>(() => {
    const mats = this.materiales();
    const map = new Map<number, Map<number, Material[]>>();
    for (const m of mats) {
      if (!map.has(m.semana)) map.set(m.semana, new Map());
      const clases = map.get(m.semana)!;
      if (!clases.has(m.clase)) clases.set(m.clase, []);
      clases.get(m.clase)!.push(m);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([semana, clases]) => ({
        semana,
        clases: Array.from(clases.entries())
          .sort(([a], [b]) => a - b)
          .map(([clase, items]) => ({ clase, items }))
      }));
  });

  /* ── Signals de Tareas ── */

  tareas             = signal<Tarea[]>([]);
  cargandoTareas     = signal(false);
  mostrarFormTarea   = signal(false);
  enviandoTarea      = signal(false);
  formTarea = signal<FormTarea>({
    semana: 1, clase: 1, numeroTarea: 1,
    titulo: '', descripcion: '', tipoEntregable: '',
    fechaEntrega: '', notaMaxima: 20, intentos: 1, url: ''
  });
  /** Tareas expandidas en el acordeón: Set de ids */
  tareasExpandidas   = signal<Set<number>>(new Set());
  /** Notas cargadas por tarea: Map<idTarea, NotaTarea[]> */
  notasPorTarea      = signal<Map<number, NotaTarea[]>>(new Map());
  /** Estado de edición de nota: Map<idNota, string> (valor temporal) */
  editandoNota       = signal<Map<number, string>>(new Map());
  guardandoNota      = signal<Set<number>>(new Set());

  /* ── Signals de Exámenes ── */

  examenes             = signal<Examen[]>([]);
  cargandoExamenes     = signal(false);
  mostrarFormExamen    = signal(false);
  enviandoExamen       = signal(false);
  formExamen = signal<FormExamen>({
    semana: 1, clase: 1, numeroExamen: 1,
    titulo: '', descripcion: '', tipo: 'escrito',
    fechaExamen: '', duracionMinutos: 90, notaMaxima: 20, url: ''
  });
  examenesExpandidos   = signal<Set<number>>(new Set());
  notasPorExamen       = signal<Map<number, NotaExamen[]>>(new Map());
  editandoNotaEx       = signal<Map<number, string>>(new Map());
  guardandoNotaEx      = signal<Set<number>>(new Set());

  /* ── Signals de Reportes ── */

  reportesAlumnos      = signal<AlumnoReportes[]>([]);
  cargandoReportes     = signal(false);
  mostrarFormReporte   = signal(false);
  enviandoReporte      = signal(false);
  alumnosExpandidos    = signal<Set<number>>(new Set());
  formReporte = signal<FormReporte>({
    idAlumno: null, tipo: 'anotacion',
    titulo: '', descripcion: '', fecha: '', visiblePadre: true
  });

  /* ── Signals de Temario ── */

  unidades = signal<Unidad[]>([]);
  cargandoTemario = signal(false);
  mostrarFormUnidad = signal(false);
  formUnidad = signal<FormUnidad>({ numero: 1, titulo: '', bimestre: 'Bimestre I', semanas: '', objetivos: '', indicadores: '', contenidos: '', estado: 'pendiente' });
  unidadesAbiertas = signal<Set<number>>(new Set([1]));

  progresoTemario = computed(() => {
    const list = this.unidades();
    const total = list.length;
    if (total === 0) return { concluido: 0, enCurso: 0, pendiente: 100, totalPct: 0 };
    const concluidas = list.filter(u => u.estado === 'concluido').length;
    const enCurso = list.filter(u => u.estado === 'en_curso').length;

    const pctConcluido = (concluidas / total) * 100;
    const pctEnCurso = (enCurso * 0.5 / total) * 100;
    const pctPendiente = 100 - pctConcluido - pctEnCurso;

    return {
      concluido: Math.round(pctConcluido),
      enCurso: Math.round(pctEnCurso),
      pendiente: Math.round(pctPendiente),
      totalPct: Math.round((concluidas + enCurso * 0.5) / total * 100)
    };
  });

  /* ── Signals de Asistencia ── */

  sesionAsistencia    = signal<SesionAsistencia | null>(null);
  cargandoAsistencia  = signal(false);
  guardandoAsistencia = signal(false);
  asistenciaModificada = signal(false);
  fechaAsistencia     = signal<string>('');
  fechasSesiones      = signal<string[]>([]);
  mostrarConsolidado  = signal(false);
  cargandoConsolidado = signal(false);
  mesConsolidado      = signal<string>(''); // YYYY-MM
  datosConsolidado    = signal<ConsolidadoMensual | null>(null);
  /** Copia local editable de alumnos — se modifica antes de guardar */
  asistenciaLocal     = signal<AsistenciaAlumno[]>([]);

  /* ── Signals de comunicados (Refuerzos) ── */

  /** Lista completa de comunicados del docente */
  comunicados          = signal<Comunicado[]>([]);
  cargandoComunicados  = signal(false);
  errorComunicados     = signal('');
  /** Aulas del docente para el selector del formulario */
  misAulas             = signal<AulaSimple[]>([]);
  /** Controla si el formulario de creación está visible */
  mostrarFormCom       = signal(false);
  /** Enviando estado del formulario */
  enviandoCom          = signal(false);
  /** Filtro de grado en la lista de comunicados ('' = Todos) */
  filtroGradoCom       = signal('');
  /** Tipos de evento disponibles (cargados del backend) */
  tiposEvento        = signal<TipoEvento[]>([]);
  /** Estado del formulario de nuevo comunicado */
  formCom = signal<FormComunicado>({
    titulo: '', tipo: '', idAulas: [], descripcion: '',
    fechaEvento: '', horaEvento: '', nuevoTipo: '', mostrarNuevoTipo: false
  });

  /** Grados únicos en los comunicados para los tabs de filtro */
  gradosComunicados = computed(() => {
    const todosGrados = new Set<string>();
    this.comunicados().forEach(c => {
      if (c.grado && c.grado !== 'Todos los grados') todosGrados.add(c.grado);
    });
    return [...todosGrados].sort();
  });

  /** Comunicados filtrados por grado+sección seleccionado */
  comunicadosFiltrados = computed(() => {
    const f = this.filtroGradoCom();
    if (!f) return this.comunicados();
    const [grado, seccion] = f.split(' ', 2).concat(['', '']);
    return this.comunicados().filter(c =>
      c.idAulas.length === 0 ||
      c.idAulas.some(idA => {
        const aula = this.misAulas().find(a => a.id === idA);
        return aula && aula.grado === grado && aula.seccion === seccion;
      })
    );
  });

  /* ── Signals del calendario ── */

  /** Todos los bloques de clase devueltos por el backend */
  horario          = signal<ClaseHorario[]>([]);
  cargandoHorario  = signal(false);
  errorHorario     = signal('');

  /** Tab activa dentro de la sección calendario: 'mis-clases' | 'reservas' */
  calendarioTab = signal('mis-clases');

  /** Lista de reservas de espacio del docente */
  reservas = signal<Reserva[]>([]);
  cargandoReservas = signal(false);
  errorReservas = signal('');

  /** Controla si el modal de Nueva Reserva está visible */
  modalReserva = signal(false);
  reservaEditando = signal<number | null>(null);
  enviandoReserva = signal(false);
  errorDisponibilidad = signal('');
  okDisponibilidad = signal(false);
  formReserva = signal<FormReserva>({
    espacio:     '',
    fecha:       '',
    horaInicio:  '13:00',
    horaFin:     '15:00',
    idAulaCurso: null,
    proposito:   '',
  });

  /**
   * Fecha del Lunes de la semana actualmente visible.
   * Inicia en el Lunes de la semana actual.
   */
  semanaInicio = signal<Date>(this.getMonday(new Date()));

  /** Etiqueta de la semana visible, p. ej. "19 – 23 de mayo, 2026" */
  semanaLabel = computed(() => {
    const lun = this.semanaInicio();
    const vie = new Date(lun);
    vie.setDate(vie.getDate() + 4);
    const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
    const fmtLun = lun.toLocaleDateString('es-PE', { day: 'numeric', month: 'long' });
    const fmtVie = vie.toLocaleDateString('es-PE', opts);
    return `${fmtLun} – ${fmtVie}`;
  });

  /**
   * Número de día ISO de hoy (1-5) para resaltar la columna activa.
   * 0 si hoy es sábado/domingo (sin columna activa).
   */
  hoyDia = computed<number>(() => {
    const d = new Date().getDay(); // 0=Dom,1=Lun…6=Sab
    return d >= 1 && d <= 5 ? d : 0;
  });

  /**
   * Etiquetas de hora que aparecen en el eje vertical de la grilla.
   * Se generan desde CAL_HORA_INICIO hasta CAL_HORA_FIN exclusive.
   */
  horasGrilla: string[] = Array.from(
    { length: CAL_HORA_FIN - CAL_HORA_INICIO },
    (_, i) => `${String(CAL_HORA_INICIO + i).padStart(2, '0')}:00`
  );

  /** Alto total de la grilla en píxeles */
  altoGrilla = (CAL_HORA_FIN - CAL_HORA_INICIO) * CAL_PX_POR_HORA;

  /** Definición de los 5 días laborables */
  diasSemana = [
    { num: 1, corto: 'Lun', largo: 'Lunes'      },
    { num: 2, corto: 'Mar', largo: 'Martes'     },
    { num: 3, corto: 'Mié', largo: 'Miércoles'  },
    { num: 4, corto: 'Jue', largo: 'Jueves'     },
    { num: 5, corto: 'Vie', largo: 'Viernes'    },
  ];

  clasesDeHoy = computed(() => {
    const diaHoy = this.hoyDia();
    if (diaHoy === 0) return [];
    const bloques = this.horario().filter(h => h.dia === diaHoy);
    const seen = new Set<string>();
    const result: Curso[] = [];
    for (const b of bloques) {
      const key = `${b.curso}|${b.grado}|${b.seccion}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const curso = this.cursos().find(c =>
        c.nombre === b.curso && c.grado === b.grado && c.seccion === b.seccion);
      if (curso) result.push(curso);
    }
    return result;
  });

  grades = computed(() => {
    const base   = ['Clases de Hoy', 'Todos los Cursos'];
    const unique = [...new Set(this.cursos().map(c => c.grado))];
    return [...base, ...unique];
  });

  filteredCursos = computed(() => {
    if (this.activeGrade() === 'Clases de Hoy') return this.clasesDeHoy();
    if (this.activeGrade() === 'Todos los Cursos') return this.cursos();
    return this.cursos().filter(c => c.grado === this.activeGrade());
  });

  constructor() {
    const token = this.auth.getToken();
    const rol = this.auth.getRol();
    if (!token || rol !== 'maestro') {
      this.auth.logout();
      this.router.navigate(['/']);
      this.auth.openLogin();
      return;
    }

    this.cargarCursos();
    this.cargarHorario();
    this.cargarMensajes();
    this.cargarComunicados();
    this.cargarMisAulas();
    this.cargarTiposEvento();
    this.cargarPendientes();
    this.cargarAlertasCriticas();
    this.cargarReservas();
    this.cargarEspaciosDisponibles();
    // Conectar WebSocket para recibir notificaciones en tiempo real
    this.ws.connect();
  }

  ngOnDestroy(): void {
    this.ws.disconnect();
  }

  /* ══════════════════════════════════════════
     RESERVAS DE ESPACIO
  ══════════════════════════════════════════ */

  /** Carga los espacios disponibles para el docente autenticado */
  cargarEspaciosDisponibles() {
    this.docenteService.getEspaciosDisponibles().subscribe({
      next: data => {
        this.espaciosDisponibles.set(data);
        if (data.length > 0 && !this.formReserva().espacio) {
          this.formReserva.update(f => ({ ...f, espacio: data[0].nombre }));
        }
      },
      error: () => { /* no bloquea la UI si falla */ },
    });
  }

  /** Reservas de la semana actualmente visible (por rango de fechas) */
  reservasForSemana = computed(() => {
    const inicio = this.semanaInicio();
    const fin = new Date(inicio);
    fin.setDate(fin.getDate() + 4);
    const inicioStr = this.formatISODate(inicio);
    const finStr = this.formatISODate(fin);
    return this.reservas().filter(r => r.fecha >= inicioStr && r.fecha <= finStr);
  });

  /** Reservas que caen en un día concreto (1-5) de la semana visible */
  reservasDelDia(dia: number): Reserva[] {
    const fecha = this.fechaDeDia(dia);
    return this.reservasForSemana().filter(r => r.fecha === fecha);
  }

  /** Fecha ISO para un día de la semana visible (1=Lunes) */
  fechaDeDia(dia: number): string {
    const d = new Date(this.semanaInicio());
    d.setDate(d.getDate() + (dia - 1));
    return this.formatISODate(d);
  }

  /** Formato YYYY-MM-DD de una fecha local */
  formatISODate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /* ══════════════════════════════════════════
     HELPERS GENERALES DEL CALENDARIO
  ══════════════════════════════════════════ */

  /**
   * Devuelve el Lunes de la semana a la que pertenece `fecha`.
   * Usa ISO: lunes = 1, domingo = 7.
   */
  getMonday(fecha: Date): Date {
    const d = new Date(fecha);
    const dia = d.getDay();                 // 0=Dom, 1=Lun…6=Sab
    const diff = dia === 0 ? -6 : 1 - dia; // cuántos días hay que restar
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /** Avanza la semana visible 7 días hacia adelante */
  semanaAnterior() {
    const d = new Date(this.semanaInicio());
    d.setDate(d.getDate() - 7);
    this.semanaInicio.set(d);
  }

  /** Retrocede la semana visible 7 días hacia atrás */
  semanaSiguiente() {
    const d = new Date(this.semanaInicio());
    d.setDate(d.getDate() + 7);
    this.semanaInicio.set(d);
  }

  /** Vuelve a la semana actual */
  semanaHoy() {
    this.semanaInicio.set(this.getMonday(new Date()));
  }

  /**
   * Filtra los bloques de horario para un día concreto (1-5).
   * Se usa en la plantilla para poblar cada columna de la grilla.
   */
  clasesDelDia(dia: number): ClaseHorario[] {
    return this.horario().filter(c => c.dia === dia);
  }

  /**
   * Calcula la posición vertical (top) de un bloque en la grilla.
   * Fórmula: (minutos_desde_HORA_INICIO) × (PX_POR_HORA / 60)
   */
  blockTop(horaInicio: string): number {
    const [h, m] = horaInicio.split(':').map(Number);
    const minutos = (h * 60 + m) - CAL_HORA_INICIO * 60;
    return Math.round(minutos * CAL_PX_POR_HORA / 60);
  }

  /**
   * Calcula el alto de un bloque en la grilla según su duración.
   * Se resta 2px para dejar un pequeño espacio visual entre bloques.
   */
  blockHeight(horaInicio: string, horaFin: string): number {
    const [h1, m1] = horaInicio.split(':').map(Number);
    const [h2, m2] = horaFin.split(':').map(Number);
    const duracion = (h2 * 60 + m2) - (h1 * 60 + m1);
    return Math.round(duracion * CAL_PX_POR_HORA / 60) - 2;
  }

  /**
   * Devuelve el color de fondo para un curso dado.
   * Si el curso no tiene color definido en CURSO_COLORS, usa el gris por defecto.
   */
  cursoColor(curso: string): string {
    return CURSO_COLORS[curso.toLowerCase()] ?? '#94a3b8';
  }

  /* ══════════════════════════════════════════
     RESERVAS DE ESPACIO — métodos
  ══════════════════════════════════════════ */

  /** Abre/cierra el modal de reserva y resetea el formulario */
  toggleModalReserva(abrir: boolean, dia?: number, hora?: string, reserva?: Reserva) {
    if (abrir) {
      if (reserva) {
        this.reservaEditando.set(reserva.id);
        this.formReserva.set({
          espacio:     reserva.espacio,
          fecha:       reserva.fecha,
          horaInicio:  reserva.horaInicio,
          horaFin:     reserva.horaFin,
          idAulaCurso: reserva.idAulaCurso,
          proposito:   reserva.proposito || '',
        });
      } else {
        this.reservaEditando.set(null);
        const fecha = dia ? this.fechaDeDia(dia) : this.formatISODate(new Date());
        const hIni = hora ? `${hora}:00` : '13:00';
        const hFin = hora ? `${(Number(hora) + 1).toString().padStart(2, '0')}:00` : '15:00';
        this.formReserva.set({
          espacio:     this.espaciosDisponibles()[0]?.nombre ?? '',
          fecha,
          horaInicio:  hIni,
          horaFin:     hFin,
          idAulaCurso: null,
          proposito:   '',
        });
      }
      this.errorDisponibilidad.set('');
      this.okDisponibilidad.set(false);
    } else {
      this.reservaEditando.set(null);
    }
    this.modalReserva.set(abrir);
  }

  /** Abre el modal desde una celda vacía (dia + hora) */
  abrirReservaEnHora(dia: number, hora: string) {
    this.toggleModalReserva(true, dia, hora);
  }

  /** Abre el modal para editar una reserva existente */
  editarReserva(reserva: Reserva) {
    this.toggleModalReserva(true, undefined, undefined, reserva);
  }

  /** Actualiza un campo del formulario de reserva */
  setFormReserva(campo: keyof FormReserva, valor: string | number | null) {
    this.formReserva.update(f => ({ ...f, [campo]: valor }));
    this.errorDisponibilidad.set('');
    this.okDisponibilidad.set(false);
  }

  /** Carga todas las reservas del docente autenticado */
  cargarReservas() {
    this.cargandoReservas.set(true);
    this.errorReservas.set('');
    this.docenteService.getReservas()
      .subscribe({
        next: data => { this.reservas.set(data); this.cargandoReservas.set(false); },
        error: () => { this.errorReservas.set('No se pudieron cargar las reservas.'); this.cargandoReservas.set(false); },
      });
  }

  /** Verifica disponibilidad del espacio en el horario del formulario */
  verificarDisponibilidad() {
    const f = this.formReserva();
    this.errorDisponibilidad.set('');
    this.okDisponibilidad.set(false);
    const body = {
      espacio: f.espacio,
      fecha: f.fecha,
      horaInicio: f.horaInicio,
      horaFin: f.horaFin,
    };
    this.docenteService.verificarDisponibilidad(body).subscribe({
      next: res => {
        if (res.disponible) {
          this.okDisponibilidad.set(true);
          this.errorDisponibilidad.set('');
        } else {
          this.errorDisponibilidad.set(res.mensaje || 'El espacio ya está reservado en ese horario.');
        }
      },
      error: () => this.errorDisponibilidad.set('No se pudo verificar la disponibilidad.'),
    });
  }

  /** Verifica si la reserva actual choca con una clase programada distinta a la seleccionada */
  private tieneConflictoHorario(): boolean {
    const f = this.formReserva();
    if (!f.fecha || !f.horaInicio || !f.horaFin) return false;

    const dia = new Date(f.fecha).getUTCDay(); // 1=Lunes … 5=Viernes
    if (dia === 0 || dia === 6) return false;

    const toMin = (h: string) => {
      const [hh, mm] = h.split(':').map(Number);
      return hh * 60 + mm;
    };

    const ini = toMin(f.horaInicio);
    const fin = toMin(f.horaFin);

    const clasesDelDia = this.horario().filter(c => c.dia === dia);
    const claseEnHorario = clasesDelDia.find(c => {
      const cIni = toMin(c.horaInicio);
      const cFin = toMin(c.horaFin);
      return cIni < fin && cFin > ini;
    });

    if (!claseEnHorario) return false;
    return f.idAulaCurso !== claseEnHorario.idAulaCurso;
  }

  /** Crea o actualiza la reserva en el backend */
  guardarReserva() {
    const f = this.formReserva();
    if (!f.espacio || !f.fecha || !f.horaInicio || !f.horaFin) return;

    this.errorDisponibilidad.set('');

    const parseMin = (h: string) => {
      const [hh, mm] = h.split(':').map(Number);
      return hh * 60 + mm;
    };

    const startMin = parseMin(f.horaInicio);
    const endMin = parseMin(f.horaFin);

    if (endMin <= startMin) {
      this.errorDisponibilidad.set('La hora de fin debe ser posterior a la hora de inicio.');
      return;
    }

    // Validación 1: Horario permitido únicamente de 07:00 AM a 02:00 PM
    if (startMin < 420 || endMin > 840) {
      this.errorDisponibilidad.set('El horario de reserva permitido es únicamente de 07:00 AM a 02:00 PM.');
      return;
    }

    // Formatear hoy en formato YYYY-MM-DD en la zona horaria local de Lima
    const now = new Date();
    // Obtener fecha local como YYYY-MM-DD
    const localYear = now.getFullYear();
    const localMonth = String(now.getMonth() + 1).padStart(2, '0');
    const localDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${localYear}-${localMonth}-${localDay}`;

    // Validación 2: No permitir fecha pasada
    if (f.fecha < todayStr) {
      this.errorDisponibilidad.set('No se permite reservar en una fecha pasada.');
      return;
    }

    // Validación 3: No permitir hora pasada si es hoy
    if (f.fecha === todayStr) {
      const currentMin = now.getHours() * 60 + now.getMinutes();
      if (startMin <= currentMin) {
        this.errorDisponibilidad.set('No se permite reservar en una hora pasada.');
        return;
      }
    }

    // Validación 4: Días laborables únicamente (lunes a viernes)
    const dayOfWeek = new Date(f.fecha + 'T00:00:00').getDay(); // 0=Domingo, 6=Sábado, 1=Lunes
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      this.errorDisponibilidad.set('Las reservas de espacios solo se permiten de lunes a viernes.');
      return;
    }

    if (this.tieneConflictoHorario()) {
      this.errorDisponibilidad.set('No puedes reservar en este horario porque tienes clase programada con otro grado/sección.');
      return;
    }

    this.enviandoReserva.set(true);
    const body = {
      espacio: f.espacio,
      fecha: f.fecha,
      horaInicio: f.horaInicio,
      horaFin: f.horaFin,
      idAulaCurso: f.idAulaCurso,
      proposito: f.proposito?.trim() || null,
    };

    const handleError = (err: any) => {
      this.enviandoReserva.set(false);
      let msg = err?.error?.message || err?.message || 'El espacio ya está reservado en ese horario. Selecciona otra hora o espacio.';
      if (err?.status === 401) {
        msg = 'Tu sesión expiró. Por favor, cierra sesión y vuelve a ingresar.';
      }
      this.errorDisponibilidad.set(msg);
    };

    const idEdit = this.reservaEditando();
    if (idEdit) {
      this.docenteService.actualizarReserva(idEdit, body)
        .subscribe({
          next: () => {
            this.modalReserva.set(false);
            this.reservaEditando.set(null);
            this.enviandoReserva.set(false);
            this.cargarReservas();
          },
          error: handleError,
        });
    } else {
      this.docenteService.crearReserva(body)
        .subscribe({
          next: () => {
            this.modalReserva.set(false);
            this.enviandoReserva.set(false);
            this.cargarReservas();
          },
          error: handleError,
        });
    }
  }

  /** Anula la reserva que se está editando */
  anularReserva() {
    const id = this.reservaEditando();
    if (id) {
      this.eliminarReserva(id);
      this.modalReserva.set(false);
      this.reservaEditando.set(null);
    }
  }

  /** Elimina una reserva propia del docente */
  eliminarReserva(id: number) {
    this.reservas.update(list => list.filter(r => r.id !== id));
    this.docenteService.eliminarReserva(id)
      .subscribe({ error: () => this.cargarReservas() });
  }

  /* ══════════════════════════════════════════
     CARGA DE DATOS
  ══════════════════════════════════════════ */

  private cargarCursos() {
    this.cargando.set(true);
    this.errorCarga.set('');

    this.docenteService.getMisCursos()
      .subscribe({
        next: (data) => {
          this.cursos.set(data.map((c, i) => this.mapCurso(c, i)));
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudieron cargar los cursos.');
          this.cargando.set(false);
        },
      });
  }

  /* ── Mensajería: carga, apertura y respuesta ── */

  /** Carga la bandeja de entrada del docente desde el backend */
  cargarMensajes() {
    this.cargandoMensajes.set(true);
    this.errorMensajes.set('');
    this.docenteService.getMensajes()
      .subscribe({
        next: data => { this.mensajes.set(data); this.cargandoMensajes.set(false); },
        error: ()  => { this.errorMensajes.set('No se pudieron cargar los mensajes.'); this.cargandoMensajes.set(false); },
      });
  }

  /**
   * Abre un mensaje: solicita el detalle al backend y lo muestra en el panel derecho.
   * El backend marca el mensaje como leído automáticamente.
   * También actualiza el flag `leido` en la lista local para que el badge desaparezca.
   */
  abrirMensaje(id: number) {
    this.mensajeActivo.set(null);
    this.contextoAlumno.set(null);
    this.mostrarContexto.set(false);
    this.replyText.set('');
    this.docenteService.getMensajeDetalle(id)
      .subscribe({
        next: data => {
          this.mensajeActivo.set(data);
          /* Actualizar el flag leido en la lista local sin recargar todo */
          this.mensajes.update(lista =>
            lista.map(m => m.id === id ? { ...m, leido: true } : m)
          );
          /* Cargar contexto del alumno automáticamente si hay idAlumno */
          if (data.idAlumno) {
            this.cargarContextoAlumno(data.idAlumno);
          }

          // Suscribirse al canal de WebSocket para este chat y recibir mensajes en tiempo real
          this.ws.subscribeToChat(id, (resp: RespuestaResumen) => {
            this.zone.run(() => {
              this.mensajeActivo.update(curr => {
                if (!curr) return null;
                if (curr.respuestas.some(r => r.id === resp.id)) return curr;
                // Filtrar temporales por ID negativo o si coincide el cuerpo
                const filtrado = curr.respuestas.filter(r => r.id > 0 && r.cuerpo !== resp.cuerpo);
                return {
                  ...curr,
                  respuestas: [...filtrado, resp]
                };
              });
              this.scrollToBottom();
            });
          });
        },
      });
  }

  /** Carga el resumen del alumno para el panel lateral */
  cargarContextoAlumno(idAlumno: number) {
    this.cargandoContexto.set(true);
    this.docenteService.getAlumnoContexto(idAlumno).subscribe({
      next: data => {
        this.contextoAlumno.set(data);
        this.cargandoContexto.set(false);
        this.mostrarContexto.set(true);
      },
      error: () => { this.cargandoContexto.set(false); },
    });
  }

  /** Alterna la visibilidad del panel de contexto del alumno */
  toggleContexto() {
    this.mostrarContexto.update(v => !v);
  }

  /** Abre el modal y carga la lista de alumnos disponibles */
  abrirModalNuevoChat() {
    this.modalNuevoChat.set(true);
    this.nuevoChatGrado.set('');
    this.nuevoChatSeccion.set('');
    this.nuevoChatBusqueda.set('');
    this.nuevoChatAlumnoSel.set(null);
    this.nuevoChatAsunto.set('');
    this.nuevoChatMensaje.set('');
    if (this.alumnosDisponibles().length === 0) {
      this.cargarAlumnosDisponibles();
    }
  }

  /** Carga el listado de alumnos disponibles desde el backend */
  cargarAlumnosDisponibles() {
    this.cargandoAlumnos.set(true);
    this.docenteService.getAlumnosDisponibles().subscribe({
      next: data => { this.alumnosDisponibles.set(data); this.cargandoAlumnos.set(false); },
      error: () => { this.cargandoAlumnos.set(false); },
    });
  }

  /** Selecciona un alumno en el modal y rellena el asunto por defecto */
  seleccionarAlumnoModal(a: AlumnoDisponible) {
    this.nuevoChatAlumnoSel.set(a);
    if (!this.nuevoChatAsunto()) {
      this.nuevoChatAsunto.set(`Consulta sobre ${a.nombreAlumno}`);
    }
  }

  /** Cierra el modal sin enviar */
  cerrarModalNuevoChat() {
    this.modalNuevoChat.set(false);
  }

  /** Envía el nuevo chat y abre el hilo creado */
  enviarNuevoChat() {
    const alumno  = this.nuevoChatAlumnoSel();
    const asunto  = this.nuevoChatAsunto().trim();
    const mensaje = this.nuevoChatMensaje().trim();
    if (!alumno || !asunto || !mensaje) return;
    this.enviandoNuevoChat.set(true);
    this.docenteService.crearNuevoMensaje({
      idAlumno:    alumno.idAlumno,
      idPadre:     alumno.idPadre,
      idAulaCurso: alumno.idAulaCurso,
      asunto,
      cuerpo:      mensaje,
    }).subscribe({
      next: res => {
        this.enviandoNuevoChat.set(false);
        this.cerrarModalNuevoChat();
        this.cargarMensajes();
        setTimeout(() => this.abrirMensaje(res.id), 400);
      },
      error: () => { this.enviandoNuevoChat.set(false); },
    });
  }

  /** % de asistencia del alumno activo */
  pctAsistencia(): number {
    const ctx = this.contextoAlumno();
    if (!ctx || ctx.totalClases === 0) return 0;
    return Math.round((ctx.clasesPresente / ctx.totalClases) * 100);
  }

  scrollToBottom() {
    setTimeout(() => {
      const container = document.querySelector('.msg-chat-thread');
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

    // Si ya hay un audio activo para esta misma respuesta, pausar/reanudar
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

    // Detener el audio anterior si existe
    if (this.playingAudio) {
      this.playingAudio.pause();
      if (this.activeAudioRespuesta) {
        this.activeAudioRespuesta.isPlaying = false;
        this.activeAudioRespuesta.audioProgress = 0;
        this.activeAudioRespuesta.currentTime = 0;
      }
    }

    const audio = new Audio();
    audio.preload = 'metadata'; // Cargar metadatos (duración) antes de reproducir
    this.playingAudio = audio;
    this.activeAudioRespuesta = r;
    r.isPlaying = false; // Esperar a que cargue antes de mostrar como playing
    r.currentTime = 0;
    r.audioProgress = 0;

    // Una vez cargados los metadatos ya tenemos la duración real
    audio.addEventListener('loadedmetadata', () => {
      this.zone.run(() => {
        r.duration = isFinite(audio.duration) ? audio.duration : 0;
      });
    });

    audio.addEventListener('timeupdate', () => {
      this.zone.run(() => {
        r.currentTime = audio.currentTime;
        r.duration = isFinite(audio.duration) ? audio.duration : r.duration || 0;
        r.audioProgress = r.duration > 0 ? (audio.currentTime / r.duration) * 100 : 0;
      });
    });

    audio.addEventListener('canplay', () => {
      this.zone.run(() => {
        r.isPlaying = true;
        audio.play().catch(err => console.warn('Error reproduciendo audio:', err));
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

    audio.addEventListener('error', (e) => {
      console.error('Error cargando audio:', e);
      this.zone.run(() => {
        r.isPlaying = false;
        this.playingAudio = null;
        this.activeAudioRespuesta = null;
      });
    });

    audio.src = audioUrl;
    audio.load();
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

  // ─── GRABACIÓN DE AUDIO (MediaRecorder) ────────────────────────────────────

  /**
   * Inicia la grabación de audio.
   * Todos los eventos del MediaRecorder corren FUERA del zone de Angular
   * para no disparar change detection con cada chunk de audio (cada 500ms).
   */
  iniciarGrabacion() {
    if (this.grabando()) return;
    this.isAudioCancelled = false;

    this.zone.runOutsideAngular(() => {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
          this.activeStream = stream;
          this.audioChunks = [];

          // ─── VISUALIZADOR DE ONDAS DE AUDIO ───
          try {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextClass();
            this.audioCtx = audioCtx;

            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64; // Bajo fftSize para tener 32 bins de frecuencia
            source.connect(analyser);
            this.analyser = analyser;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateWaves = () => {
              if (!this.grabando() || !this.analyser) {
                return;
              }
              this.analyser.getByteFrequencyData(dataArray);

              // Mapear frecuencia a 24 barras de alturas (entre 4px y 36px)
              const heights: number[] = [];
              const step = Math.floor(bufferLength / 24) || 1;
              for (let i = 0; i < 24; i++) {
                const val = dataArray[i * step] || 0;
                const minHeight = 4;
                const maxHeight = 36;
                const hVal = minHeight + (val / 255) * (maxHeight - minHeight);
                heights.push(Math.round(hVal));
              }

              this.zone.run(() => {
                this.valoresFrecuencia.set(heights);
              });

              this.animationFrameId = requestAnimationFrame(updateWaves);
            };

            this.animationFrameId = requestAnimationFrame(updateWaves);
          } catch (audioErr) {
            console.warn('No se pudo inicializar AudioContext del visualizador:', audioErr);
          }

          // Auto-detectar el codec soportado
          const mimeType = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/mp4',
          ].find(t => MediaRecorder.isTypeSupported(t)) ?? '';

          const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
          this.mediaRecorder = recorder;

          recorder.ondataavailable = (e: BlobEvent) => {
            if (e.data && e.data.size > 0) {
              this.audioChunks.push(e.data);
            }
          };

          recorder.onstop = () => {
            // Detener pistas del micro
            stream.getTracks().forEach(t => t.stop());
            this.activeStream = null;

            this.zone.run(() => {
              this.limpiarVisualizador();
            });

            if (this.isAudioCancelled) {
              this.audioChunks = [];
              return;
            }

            const blob = new Blob(this.audioChunks, { type: recorder.mimeType || 'audio/webm' });
            this.audioChunks = [];

            // Volver al zone solo para actualizar la UI y enviar
            this.zone.run(() => {
              if (blob.size > 0) {
                this.enviarAudio(blob, recorder.mimeType);
              } else {
                console.warn('El audio capturado está vacío (0 bytes).');
              }
            });
          };

          // Iniciar grabación sin timeslice para obtener un solo blob consolidado
          recorder.start();

          // Actualizar estado dentro del zone
          this.zone.run(() => {
            this.grabando.set(true);
            this.duracionGrabacion.set(0);
          });

          // El setInterval también fuera del zone
          this.recordingInterval = setInterval(() => {
            this.zone.run(() => this.duracionGrabacion.update(d => d + 1));
          }, 1000);
        })
        .catch(err => {
          this.zone.run(() => {
            if (err.name === 'NotAllowedError') {
              alert('Permiso de micrófono denegado. Habilítalo en la configuración del navegador.');
            } else {
              alert('No se pudo acceder al micrófono: ' + err.message);
            }
          });
        });
    });
  }

  detenerGrabacion() {
    if (!this.grabando() || !this.mediaRecorder) return;
    this.isAudioCancelled = false;
    clearInterval(this.recordingInterval);
    this.recordingInterval = null;
    this.grabando.set(false);
    this.limpiarVisualizador();
    try {
      this.mediaRecorder.stop();
    } catch (e) {
      console.warn('Error al detener grabador:', e);
    }
    this.mediaRecorder = null;
  }

  cancelarGrabacion() {
    if (!this.mediaRecorder) return;
    this.isAudioCancelled = true;
    clearInterval(this.recordingInterval);
    this.recordingInterval = null;
    this.grabando.set(false);
    this.limpiarVisualizador();
    try {
      this.mediaRecorder.stop();
    } catch (e) {
      console.warn('Error al detener grabador:', e);
    }
    this.mediaRecorder = null;
    if (this.activeStream) {
      this.activeStream.getTracks().forEach(t => t.stop());
      this.activeStream = null;
    }
  }

  private limpiarVisualizador() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.analyser = null;
    this.valoresFrecuencia.set(Array(24).fill(4));
  }

  enviarAudio(audioBlob: Blob, mimeType?: string) {
    const activo = this.mensajeActivo();
    if (!activo) return;

    // Determinar extensión según el tipo MIME
    const ext = (mimeType || '').includes('ogg') ? 'ogg' : 'webm';

    // Agregar mensaje optimista temporal
    const tempId = -Date.now();
    const tempResp: any = {
      id: tempId,
      cuerpo: '[AUDIO] /uploads/audios/temp.' + ext,
      fecha: 'Enviando...',
      nombreAutor: 'Yo',
      esMaestro: true,
      isPlaying: false,
      audioProgress: 0,
      currentTime: 0
    };

    this.mensajeActivo.update(curr => {
      if (!curr) return null;
      return { ...curr, respuestas: [...curr.respuestas, tempResp] };
    });
    this.scrollToBottom();

    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.' + ext);

    this.docenteService.responderMensajeAudio(activo.id, formData)
      .subscribe({
        next: () => { /* WebSocket actualizará con el mensaje real */ },
        error: () => {
          this.mensajeActivo.update(curr => {
            if (!curr) return null;
            return { ...curr, respuestas: curr.respuestas.filter(r => r.id !== tempId) };
          });
          alert('Error al enviar nota de voz.');
        }
      });
  }

  // ─── DICTADO POR VOZ (Speech-to-Text) ──────────────────────────────────────

  /**
   * Activa/desactiva el dictado por voz.
   * - Los callbacks del SpeechRecognition ya corren fuera del zone de Angular
   *   (son callbacks nativos del browser), por eso necesitamos zone.run() para updates.
   * - Auto-reinicia cuando Chrome detiene la sesión en silencio.
   * - Al detener, el texto provisional (interim) se confirma en el textarea.
   */
  toggleDictado() {
    if (this.dictando()) {
      this._stopDictado(/* commitInterim= */ true);
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert('Tu navegador no soporta el reconocimiento de voz.\nUsa Google Chrome o Microsoft Edge.');
      return;
    }

    const rec = new SR() as any;
    rec.lang = 'es-ES';
    rec.continuous = true;        // Sesión larga (no termina tras 1 frase)
    rec.interimResults = true;    // Resultados provisionales en tiempo real
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      this.zone.run(() => this.dictando.set(true));
    };

    rec.onresult = (ev: any) => {
      let final = '';
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const text = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }
      this.zone.run(() => {
        if (final) {
          // Texto confirmado → acumular en el input
          const prev = this.replyText();
          this.replyText.set(prev ? (prev + ' ' + final).trim() : final.trim());
          this.dictadoInterim.set('');
        } else {
          // Texto provisional → mostrarlo solo visualmente
          this.dictadoInterim.set(interim);
        }
      });
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
        this._stopDictado(false);
      });
    };

    rec.onend = () => {
      if (this.dictando()) {
        try {
          rec.start(); // Auto-reiniciar para dictado continuo
        } catch {
          this.zone.run(() => this._stopDictado(false));
        }
      }
    };

    this.recognition = rec;
    rec.start();
  }

  /** Detiene el dictado. Si commitInterim=true, el texto provisional se confirma. */
  private _stopDictado(commitInterim: boolean) {
    if (this.recognition) {
      try { this.recognition.stop(); } catch { /* ignorar */ }
      this.recognition = null;
    }
    if (commitInterim) {
      const interim = this.dictadoInterim();
      if (interim.trim()) {
        const prev = this.replyText();
        this.replyText.set(prev ? (prev + ' ' + interim).trim() : interim.trim());
      }
    }
    this.dictando.set(false);
    this.dictadoInterim.set('');
  }

  copilotoSugerirRespuesta() {
    const activo = this.mensajeActivo();
    if (!activo) return;

    this.sugiriendoRespuesta.set(true);
    this.docenteService.sugerirRespuesta(activo.id)
      .subscribe({
        next: (data) => {
          this.sugiriendoRespuesta.set(false);
          if (data && data.sugerencia) {
            this.replyText.set(data.sugerencia);
          }
        },
        error: () => {
          this.sugiriendoRespuesta.set(false);
          alert('No se pudo generar la sugerencia empática en este momento.');
        }
      });
  }

  /**
   * Envía la respuesta del docente al hilo activo de forma optimista.
   */
  enviarRespuesta() {
    const activo = this.mensajeActivo();
    const texto  = this.replyText().trim();
    if (!activo || !texto) return;

    // Agregar de forma optimista localmente de inmediato
    const tempId = -Date.now();
    const tempResp: RespuestaResumen = {
      id: tempId,
      cuerpo: texto,
      fecha: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) + ' 🕒',
      nombreAutor: 'Yo',
      esMaestro: true
    };

    this.mensajeActivo.update(curr => {
      if (!curr) return null;
      return {
        ...curr,
        respuestas: [...curr.respuestas, tempResp]
      };
    });
    this.scrollToBottom();
    this.replyText.set('');

    this.enviandoReply.set(true);
    this.docenteService.responderMensaje(activo.id, { cuerpo: texto })
      .subscribe({
        next: () => {
          this.enviandoReply.set(false);
          // Dejar que el websocket inserte el mensaje final y remueva el optimista
        },
        error: () => {
          this.enviandoReply.set(false);
          // Remover el mensaje optimista en caso de fallo
          this.mensajeActivo.update(curr => {
            if (!curr) return null;
            return {
              ...curr,
              respuestas: curr.respuestas.filter(r => r.id !== tempId)
            };
          });
          alert('No se pudo enviar el mensaje.');
        },
      });
  }

  /**
   * Refina el mensaje escrito usando IA (OpenAI).
   */
  refinarMensajeConIA(tipo: 'respuesta' | 'nuevo'): void {
    const texto = tipo === 'respuesta' ? this.replyText().trim() : this.nuevoChatMensaje().trim();
    if (!texto || this.refinandoConIA()) return;

    this.refinandoConIA.set(true);

    let nombreAlumno = 'el estudiante';
    let nombreDestinatario = 'Apoderado';

    if (tipo === 'respuesta') {
      const activo = this.mensajeActivo();
      if (activo) {
        nombreAlumno = activo.nombreAlumno || 'el estudiante';
        nombreDestinatario = activo.nombrePadre || 'Apoderado';
      }
    } else {
      const sel = this.nuevoChatAlumnoSel();
      if (sel) {
        nombreAlumno = sel.nombreAlumno || 'el estudiante';
        nombreDestinatario = sel.nombrePadre || 'Apoderado';
      }
    }

    this.docenteService.refinarRespuestaIA({ 
      texto,
      nombreAlumno,
      nombreDestinatario
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
        alert('No se pudo refinar el mensaje con IA. Por favor, inténtalo más tarde.');
      }
    });
  }


  /**
   * Convierte una cadena "DD/MM/YYYY HH:MM" a tiempo relativo legible.
   * Ejemplo: "hace 2 horas", "hace 3 días".
   */
  tiempoRelativo(fechaStr: string): string {
    const [datePart, timePart] = fechaStr.split(' ');
    const [d, mo, y]  = datePart.split('/').map(Number);
    const [h, mi]     = timePart.split(':').map(Number);
    const fecha = new Date(y, mo - 1, d, h, mi);
    const diff  = Date.now() - fecha.getTime();
    const mins  = Math.floor(diff / 60_000);
    const hrs   = Math.floor(mins  / 60);
    const dias  = Math.floor(hrs   / 24);
    if (dias  > 0) return `hace ${dias} día${dias > 1 ? 's' : ''}`;
    if (hrs   > 0) return `hace ${hrs} hora${hrs > 1 ? 's' : ''}`;
    if (mins  > 0) return `hace ${mins} min`;
    return 'ahora';
  }

  /* ── Comunicados: carga, creación y eliminación ── */

  /** Carga todos los comunicados del docente desde el backend */
  cargarComunicados() {
    this.cargandoComunicados.set(true);
    this.errorComunicados.set('');
    this.docenteService.getComunicados()
      .subscribe({
        next: data => { this.comunicados.set(data); this.cargandoComunicados.set(false); },
        error: ()   => { this.errorComunicados.set('No se pudieron cargar los comunicados.'); this.cargandoComunicados.set(false); },
      });
  }

  /** Carga las aulas del docente para poblar el selector del formulario */
  private cargarMisAulas() {
    this.docenteService.getMisAulasComunicados()
      .subscribe({ next: data => this.misAulas.set(data) });
  }

  /** Carga los tipos de evento desde el backend */
  cargarTiposEvento() {
    this.docenteService.getTiposEventos().subscribe({ next: data => this.tiposEvento.set(data) });
  }

  /** Abre/cierra el formulario y lo resetea al abrir */
  toggleFormCom() {
    const abrir = !this.mostrarFormCom();
    if (abrir) {
      const primerTipo = this.tiposEvento()[0]?.nombre ?? '';
      this.formCom.set({
        titulo: '', tipo: primerTipo, idAulas: [], descripcion: '',
        fechaEvento: '', horaEvento: '', nuevoTipo: '', mostrarNuevoTipo: false
      });
      if (this.tiposEvento().length === 0) this.cargarTiposEvento();
    }
    this.mostrarFormCom.set(abrir);
  }

  /** Actualiza un campo del formulario de comunicado de forma reactiva */
  setFormCom(campo: keyof FormComunicado, valor: string | number | boolean | null | number[]) {
    this.formCom.update(f => ({ ...f, [campo]: valor }));
  }

  /** Limpia la selección de aulas (Todos los grados) */
  resetIdAulas() { this.formCom.update(f => ({ ...f, idAulas: [] })); }

  /** Agrega o quita un aula del selector multi-grado */
  toggleAulaFormCom(idAula: number) {
    this.formCom.update(f => {
      const ya = f.idAulas.includes(idAula);
      return { ...f, idAulas: ya ? f.idAulas.filter(id => id !== idAula) : [...f.idAulas, idAula] };
    });
  }

  /** Crea un tipo de evento personalizado y lo selecciona en el form */
  crearNuevoTipoEvento() {
    const nombre = this.formCom().nuevoTipo.trim();
    if (!nombre) return;
    this.docenteService.crearTipoEvento({ nombre }).subscribe({
      next: nuevo => {
        this.tiposEvento.update(t => [...t, nuevo]);
        this.formCom.update(f => ({ ...f, tipo: nuevo.nombre, nuevoTipo: '', mostrarNuevoTipo: false }));
      }
    });
  }

  /**
   * Envía el formulario al backend para crear el comunicado.
   * Al recibir el nuevo DTO lo inserta al inicio de la lista local
   * (sin recargar todos) y cierra el formulario.
   */
  enviarComunicado() {
    const f = this.formCom();
    if (!f.titulo.trim() || !f.tipo) return;
    this.enviandoCom.set(true);
    const body = {
      titulo:      f.titulo.trim(),
      tipo:        f.tipo,
      idAulas:     f.idAulas.length > 0 ? f.idAulas : [],
      descripcion: f.descripcion.trim() || null,
      fechaEvento: f.fechaEvento || null,
      horaEvento:  f.horaEvento  || null,
    };
    this.docenteService.crearComunicado(body)
      .subscribe({
        next: () => {
          this.mostrarFormCom.set(false);
          this.enviandoCom.set(false);
          this.cargarComunicados();
        },
        error: () => { this.enviandoCom.set(false); },
      });
  }

  /**
   * Elimina un comunicado por id.
   * Lo quita de la lista local antes de llamar al backend (optimistic update).
   */
  eliminarComunicado(id: number) {
    this.comunicados.update(lista => lista.filter(c => c.id !== id));
    this.docenteService.eliminarComunicado(id)
      .subscribe({ error: () => this.cargarComunicados() /* revertir si falla */ });
  }

  /** Devuelve el color de fondo del badge según tipos_evento */
  colorTipo(tipo: string): string {
    return this.tiposEvento().find(t => t.nombre === tipo)?.colorFondo ?? '#f3f4f6';
  }

  /** Devuelve el color de texto del badge según tipos_evento */
  colorTipoTexto(tipo: string): string {
    return this.tiposEvento().find(t => t.nombre === tipo)?.colorTexto ?? '#374151';
  }

  /** Devuelve el label legible del tipo (es el nombre directo) */
  labelTipo(tipo: string): string {
    return tipo;
  }

  /** Llama al endpoint /mi-horario y guarda los bloques en el signal `horario` */
  private cargarHorario() {
    this.cargandoHorario.set(true);
    this.errorHorario.set('');

    this.docenteService.getMiHorario()
      .subscribe({
        next: (data) => {
          this.horario.set(data);
          this.cargandoHorario.set(false);
        },
        error: () => {
          this.errorHorario.set('No se pudo cargar el horario.');
          this.cargandoHorario.set(false);
        },
      });
  }

  private mapCurso(c: CursoApi, idx: number): Curso {
    const key      = c.nombre.toLowerCase();
    const iconType = ICON_MAP[key] ?? 'algebra';
    const color    = CARD_COLORS[idx % CARD_COLORS.length];
    const gradoAbbr = c.grado.replace('Secundaria', 'Sec').replace('Primaria', 'Prim');
    return {
      idAulaCurso:  c.idAulaCurso,
      nombre:       c.nombre,
      grado:        c.grado,
      seccion:      c.seccion,
      color,
      iconType,
      badge:        gradoAbbr,
      horasSemana:  c.horasSemana,
      totalAlumnos: c.totalAlumnos,
    };
  }

  /* ── Navegación al detalle de curso ── */

  /** Abre el detalle de un curso y carga sus materiales y tareas */
  abrirCurso(curso: Curso) {
    this.cursoActivo.set(curso);
    this.activeSection.set('curso-detalle');
    this.activeSubTab.set('temario');
    this.semanasAbiertas.set(new Set([1]));
    this.clasesAbiertas.set(new Set(['1-1']));
    this.cargarTemario(curso.idAulaCurso);
    this.cargarMateriales(curso.idAulaCurso);
    this.cargarTareas(curso.idAulaCurso);
    this.cargarExamenes(curso.idAulaCurso);
    this.cargarReportes(curso.idAulaCurso);
    this.cargarSesionAsistencia(curso.idAulaCurso);
    this.cargarFechasSesiones(curso.idAulaCurso);
  }

  abrirCursoDesdeCalendario(cursoNombre: string, grado: string, seccion: string) {
    const curso = this.cursos().find(c =>
      c.nombre.toLowerCase().trim() === cursoNombre.toLowerCase().trim() &&
      c.grado.toLowerCase().trim() === grado.toLowerCase().trim() &&
      c.seccion.toLowerCase().trim() === seccion.toLowerCase().trim()
    );
    if (curso) {
      this.abrirCurso(curso);
    }
  }

  /** Vuelve a la sección inicio y limpia el estado del curso activo */
  volverAlInicio() {
    this.cursoActivo.set(null);
    this.unidades.set([]);
    this.mostrarFormUnidad.set(false);
    this.unidadesAbiertas.set(new Set([1]));
    this.materiales.set([]);
    this.tareas.set([]);
    this.tareasExpandidas.set(new Set());
    this.notasPorTarea.set(new Map());
    this.mostrarFormTarea.set(false);
    this.examenes.set([]);
    this.examenesExpandidos.set(new Set());
    this.notasPorExamen.set(new Map());
    this.mostrarFormExamen.set(false);
    this.reportesAlumnos.set([]);
    this.alumnosExpandidos.set(new Set());
    this.mostrarFormReporte.set(false);
    this.sesionAsistencia.set(null);
    this.asistenciaLocal.set([]);
    this.fechasSesiones.set([]);
    this.asistenciaModificada.set(false);
    this.activeSection.set('inicio');
  }

  /** Alterna si una semana está expandida en el acordeón */
  toggleSemana(s: number) {
    this.semanasAbiertas.update(set => {
      const next = new Set(set);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  /** Alterna si una clase está expandida en el acordeón */
  toggleClase(s: number, c: number) {
    const key = `${s}-${c}`;
    this.clasesAbiertas.update(set => {
      const next = new Set(set);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  /* ── Métodos de Temario ── */

  cargarTemario(idAulaCurso: number) {
    this.cargandoTemario.set(true);
    this.docenteService.getUnidades(idAulaCurso).subscribe({
      next: data => {
        this.unidades.set(data);
        this.cargandoTemario.set(false);
      },
      error: () => this.cargandoTemario.set(false)
    });
  }

  toggleUnidad(numero: number) {
    this.unidadesAbiertas.update(set => {
      const next = new Set(set);
      next.has(numero) ? next.delete(numero) : next.add(numero);
      return next;
    });
  }

  actualizarEstadoUnidad(unidad: Unidad, nuevoEstado: 'pendiente' | 'en_curso' | 'concluido') {
    const body = {
      numero: unidad.numero,
      titulo: unidad.titulo,
      bimestre: unidad.bimestre,
      semanas: unidad.semanas,
      objetivos: unidad.objetivos,
      indicadores: unidad.indicadores,
      contenidos: unidad.contenidos,
      estado: nuevoEstado
    };

    /* Optimistic update */
    this.unidades.update(list =>
      list.map(u => u.idUnidad === unidad.idUnidad ? { ...u, estado: nuevoEstado } : u)
    );

    this.docenteService.actualizarUnidad(unidad.idUnidad, body).subscribe({
      error: () => {
        const curso = this.cursoActivo();
        if (curso) this.cargarTemario(curso.idAulaCurso);
      }
    });
  }

  abrirNuevaUnidad() {
    const nextNum = this.unidades().length + 1;
    this.formUnidad.set({
      numero: nextNum,
      titulo: '',
      bimestre: 'Bimestre I',
      semanas: '',
      objetivos: '',
      indicadores: '',
      contenidos: '',
      estado: 'pendiente'
    });
    this.mostrarFormUnidad.set(true);
  }

  editarUnidad(unidad: Unidad) {
    this.formUnidad.set({
      idUnidad: unidad.idUnidad,
      numero: unidad.numero,
      titulo: unidad.titulo,
      bimestre: unidad.bimestre,
      semanas: unidad.semanas,
      objetivos: unidad.objetivos.join('\n'),
      indicadores: unidad.indicadores.join('\n'),
      contenidos: unidad.contenidos.join('\n'),
      estado: unidad.estado
    });
    this.mostrarFormUnidad.set(true);
  }

  guardarUnidad() {
    const curso = this.cursoActivo();
    if (!curso) return;
    const f = this.formUnidad();
    if (!f.titulo.trim()) return;

    const body = {
      numero: f.numero,
      titulo: f.titulo.trim(),
      bimestre: f.bimestre,
      semanas: f.semanas.trim(),
      objetivos: f.objetivos.split('\n').map(x => x.trim()).filter(Boolean),
      indicadores: f.indicadores.split('\n').map(x => x.trim()).filter(Boolean),
      contenidos: f.contenidos.split('\n').map(x => x.trim()).filter(Boolean),
      estado: f.estado
    };

    if (f.idUnidad) {
      // Edit mode
      this.docenteService.actualizarUnidad(f.idUnidad, body).subscribe({
        next: () => {
          this.cargarTemario(curso.idAulaCurso);
          this.mostrarFormUnidad.set(false);
        },
        error: () => alert('Error al actualizar la unidad didáctica.')
      });
    } else {
      // Create mode
      this.docenteService.crearUnidad(curso.idAulaCurso, body).subscribe({
        next: () => {
          this.cargarTemario(curso.idAulaCurso);
          this.mostrarFormUnidad.set(false);
        },
        error: () => alert('Error al crear la unidad didáctica.')
      });
    }
  }

  /** Carga los materiales del aula_curso dado */
  cargarMateriales(idAulaCurso: number) {
    this.cargandoMat.set(true);
    this.docenteService.getMateriales(idAulaCurso).subscribe({
      next: data => { this.materiales.set(data); this.cargandoMat.set(false); },
      error: ()   => this.cargandoMat.set(false),
    });
  }

  /** Abre/cierra el modal y resetea el formulario al abrir */
  toggleModalMaterial(abrir: boolean) {
    if (abrir) {
      this.formMaterial.set({ semana: 1, clase: 1, titulo: '', tipo: 'pdf', url: '' });
    }
    this.modalMaterial.set(abrir);
  }

  /** Actualiza un campo del formulario de material */
  setFormMat(campo: keyof FormMaterial, valor: string | number) {
    this.formMaterial.update(f => ({ ...f, [campo]: valor }));
  }

  /** Incrementa/decrementa el stepper de semana o clase */
  stepperMat(campo: 'semana' | 'clase', delta: number) {
    this.formMaterial.update(f => ({
      ...f,
      [campo]: Math.max(1, f[campo] + delta)
    }));
  }

  /** Envía el formulario del modal al backend */
  enviarMaterial() {
    const f = this.formMaterial();
    if (!f.titulo.trim()) return;
    const curso = this.cursoActivo();
    if (!curso) return;
    this.enviandoMat.set(true);

    const formData = new FormData();
    formData.append('semana', String(f.semana));
    formData.append('clase', String(f.clase));
    formData.append('titulo', f.titulo.trim());
    formData.append('tipo', f.tipo);
    if (f.url) {
      formData.append('url', f.url.trim());
    }
    if (f.file) {
      formData.append('file', f.file);
    }

    this.docenteService.crearMaterial(curso.idAulaCurso, formData).subscribe({
      next: () => {
        this.modalMaterial.set(false);
        this.enviandoMat.set(false);
        this.cargarMateriales(curso.idAulaCurso);
        /* Expandir la semana/clase recién creada */
        this.semanasAbiertas.update(s => { const n = new Set(s); n.add(f.semana); return n; });
        this.clasesAbiertas.update(s => { const n = new Set(s); n.add(`${f.semana}-${f.clase}`); return n; });
      },
      error: () => this.enviandoMat.set(false),
    });
  }

  /** Elimina un material con optimistic update */
  eliminarMaterial(id: number) {
    const curso = this.cursoActivo();
    this.materiales.update(list => list.filter(m => m.id !== id));
    this.docenteService.eliminarMaterial(id).subscribe({
      error: () => curso && this.cargarMateriales(curso.idAulaCurso)
    });
  }

  /** Devuelve el icono del tipo de material */
  iconoMaterial(tipo: string): string {
    const map: Record<string, string> = {
      pdf:     'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
      word:    'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z',
      video:   'M15 10l4.553-2.277A1 1 0 0 1 21 8.618v6.764a1 1 0 0 1-1.447.894L15 14M3 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z',
      url:     'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
      youtube: 'M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46a2.78 2.78 0 0 0-1.95 1.96A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z',
    };
    return map[tipo] ?? map['pdf'];
  }

  /** Devuelve el color del icono según tipo */
  colorMaterial(tipo: string): string {
    return ({ pdf: '#ef4444', word: '#3b82f6', video: '#8b5cf6', url: '#10b981', youtube: '#ef4444' } as Record<string, string>)[tipo] ?? '#6b7280';
  }

  /** Devuelve el label legible del tipo de material */
  labelMaterial(tipo: string): string {
    return ({ pdf: 'Material · pdf', word: 'Material · word', video: 'Material · video', url: 'Enlace · url', youtube: 'YouTube · video' } as Record<string, string>)[tipo] ?? tipo;
  }

  /* ── Métodos de Tareas ── */

  /** Carga las tareas del aula_curso activo */
  cargarTareas(idAulaCurso: number) {
    this.cargandoTareas.set(true);
    this.docenteService.getTareas(idAulaCurso).subscribe({
      next: data => { this.tareas.set(data); this.cargandoTareas.set(false); },
      error: ()   => this.cargandoTareas.set(false),
    });
  }

  /** Actualiza un campo del formulario de nueva tarea */
  setFormTarea(campo: keyof FormTarea, valor: string | number) {
    this.formTarea.update(f => ({ ...f, [campo]: valor }));
  }

  /** Stepper de campos numéricos del formulario de tarea */
  stepperTarea(campo: 'semana' | 'clase' | 'numeroTarea' | 'notaMaxima' | 'intentos', delta: number) {
    this.formTarea.update(f => ({
      ...f,
      [campo]: Math.max(1, f[campo] + delta)
    }));
  }

  /** Muestra/oculta el formulario de nueva tarea */
  toggleFormTarea(abrir: boolean) {
    if (abrir) {
      const nextNum = this.tareas().length + 1;
      this.formTarea.set({
        semana: 1, clase: 1, numeroTarea: nextNum,
        titulo: '', descripcion: '', tipoEntregable: '',
        fechaEntrega: '', notaMaxima: 20, intentos: 1, url: ''
      });
    }
    this.mostrarFormTarea.set(abrir);
  }

  /** Envía el formulario de nueva tarea al backend */
  enviarTarea() {
    const f = this.formTarea();
    if (!f.titulo.trim()) return;
    const curso = this.cursoActivo();
    if (!curso) return;
    this.enviandoTarea.set(true);
    const body = {
      semana:         f.semana,
      clase:          f.clase,
      numeroTarea:    f.numeroTarea,
      titulo:         f.titulo.trim(),
      descripcion:    f.descripcion?.trim() || null,
      tipoEntregable: f.tipoEntregable?.trim() || null,
      fechaEntrega:   f.fechaEntrega || null,
      notaMaxima:     f.notaMaxima,
      intentos:       f.intentos,
      url:            f.url?.trim() || null,
    };
    this.docenteService.crearTarea(curso.idAulaCurso, body).subscribe({
      next: () => {
        this.mostrarFormTarea.set(false);
        this.enviandoTarea.set(false);
        this.cargarTareas(curso.idAulaCurso);
      },
      error: () => this.enviandoTarea.set(false),
    });
  }

  /** Elimina una tarea con optimistic update */
  eliminarTarea(id: number) {
    const curso = this.cursoActivo();
    this.tareas.update(list => list.filter(t => t.id !== id));
    /* Limpiar notas y estado de expansión */
    this.tareasExpandidas.update(s => { const n = new Set(s); n.delete(id); return n; });
    this.notasPorTarea.update(m => { const n = new Map(m); n.delete(id); return n; });
    this.docenteService.eliminarTarea(id).subscribe({
      error: () => curso && this.cargarTareas(curso.idAulaCurso)
    });
  }

  /** Expande/colapsa una tarea y carga sus notas si no las tiene */
  toggleTarea(id: number) {
    this.tareasExpandidas.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (!this.notasPorTarea().has(id)) this.cargarNotasTarea(id);
      }
      return next;
    });
  }

  /** Carga las notas de una tarea específica */
  cargarNotasTarea(idTarea: number) {
    this.docenteService.getNotasTarea(idTarea).subscribe({
      next: data => this.notasPorTarea.update(m => new Map(m).set(idTarea, data)),
    });
  }

  /** Inicia la edición inline de la nota de un alumno */
  iniciarEditNota(idNota: number, notaActual: number | null) {
    this.editandoNota.update(m => new Map(m).set(idNota, notaActual?.toString() ?? ''));
  }

  /** Cancela la edición inline de una nota */
  cancelarEditNota(idNota: number) {
    this.editandoNota.update(m => { const n = new Map(m); n.delete(idNota); return n; });
  }

  /** Actualiza el valor temporal de la nota que se está editando */
  setEditNota(idNota: number, valor: string) {
    this.editandoNota.update(m => new Map(m).set(idNota, valor));
  }

  /** Guarda la nota en el backend y actualiza el signal localmente */
  guardarNotaAlumno(idNota: number, idTarea: number, entregado?: boolean) {
    const editMap = this.editandoNota();
    const notaStr = editMap.get(idNota);
    const nota = notaStr !== undefined && notaStr !== '' ? parseFloat(notaStr) : null;
    if (nota !== null && isNaN(nota)) return;

    this.guardandoNota.update(s => new Set(s).add(idNota));
    const body: Record<string, unknown> = {};
    if (nota !== null) body['nota'] = nota;
    if (entregado !== undefined) body['entregado'] = entregado;

    this.docenteService.guardarNotaTarea(idNota, body).subscribe({
      next: updated => {
        /* Actualizar la nota en notasPorTarea */
        this.notasPorTarea.update(m => {
          const notas = m.get(idTarea) ?? [];
          return new Map(m).set(idTarea,
            notas.map(n => n.idNota === idNota ? updated : n));
        });
        /* Actualizar stats de la tarea */
        this.tareas.update(list => list.map(t => {
          if (t.id !== idTarea) return t;
          const allNotas = this.notasPorTarea().get(idTarea) ?? [];
          return { ...t,
            entregadas:    allNotas.filter(n => n.entregado).length,
            noEntregadas:  allNotas.filter(n => !n.entregado).length,
          };
        }));
        this.guardandoNota.update(s => { const n = new Set(s); n.delete(idNota); return n; });
        this.cancelarEditNota(idNota);
      },
      error: () => this.guardandoNota.update(s => { const n = new Set(s); n.delete(idNota); return n; }),
    });
  }

  /** Toggle rápido de entregado sin abrir edición */
  toggleEntregado(idNota: number, idTarea: number, entregadoActual: boolean) {
    /* Optimistic update */
    this.notasPorTarea.update(m => {
      const notas = m.get(idTarea) ?? [];
      return new Map(m).set(idTarea,
        notas.map(n => n.idNota === idNota ? { ...n, entregado: !entregadoActual } : n));
    });
    this.docenteService.guardarNotaTarea(idNota, { entregado: !entregadoActual })
      .subscribe({ error: () => this.cargarNotasTarea(idTarea) });
  }

  /* ── Métodos de Exámenes ── */

  cargarExamenes(idAulaCurso: number) {
    this.cargandoExamenes.set(true);
    this.docenteService.getExamenes(idAulaCurso).subscribe({
      next: data => { this.examenes.set(data); this.cargandoExamenes.set(false); },
      error: (err) => {
        console.error('[Exámenes] Error en getExamenes:', err);
        this.cargandoExamenes.set(false);
      }
    });
  }

  setFormExamen(campo: keyof FormExamen, valor: string | number) {
    this.formExamen.update(f => ({ ...f, [campo]: valor }));
  }

  stepperExamen(campo: 'semana' | 'clase' | 'numeroExamen' | 'notaMaxima' | 'duracionMinutos', delta: number) {
    this.formExamen.update(f => ({
      ...f,
      [campo]: Math.max(1, f[campo] + delta)
    }));
  }

  toggleFormExamen(abrir: boolean) {
    if (abrir) {
      this.formExamen.set({
        semana: 1, clase: 1, numeroExamen: this.examenes().length + 1,
        titulo: '', descripcion: '', tipo: 'escrito',
        fechaExamen: '', duracionMinutos: 90, notaMaxima: 20, url: ''
      });
    }
    this.mostrarFormExamen.set(abrir);
  }

  enviarExamen() {
    const f = this.formExamen();
    if (!f.titulo.trim()) return;
    const curso = this.cursoActivo();
    if (!curso) return;
    this.enviandoExamen.set(true);
    const body = {
      semana:           f.semana,
      clase:            f.clase,
      numeroExamen:     f.numeroExamen,
      titulo:           f.titulo.trim(),
      descripcion:      f.descripcion?.trim() || null,
      tipo:             f.tipo,
      fechaExamen:      f.fechaExamen || null,
      duracionMinutos:  f.duracionMinutos || null,
      notaMaxima:       f.notaMaxima,
      url:              f.url?.trim() || null,
    };
    this.docenteService.crearExamen(curso.idAulaCurso, body).subscribe({
      next: () => {
        this.mostrarFormExamen.set(false);
        this.enviandoExamen.set(false);
        this.cargarExamenes(curso.idAulaCurso);
      },
      error: (err) => {
        console.error('[Exámenes] Error al crear examen:', err);
        this.enviandoExamen.set(false);
      }
    });
  }

  eliminarExamen(id: number) {
    const curso = this.cursoActivo();
    this.examenes.update(list => list.filter(e => e.id !== id));
    this.examenesExpandidos.update(s => { const n = new Set(s); n.delete(id); return n; });
    this.notasPorExamen.update(m => { const n = new Map(m); n.delete(id); return n; });
    this.docenteService.eliminarExamen(id).subscribe({
      error: (err) => {
        console.error('[Exámenes] Error al eliminar examen:', err);
        if (curso) this.cargarExamenes(curso.idAulaCurso);
      }
    });
  }

  toggleExamen(id: number) {
    this.examenesExpandidos.update(set => {
      const next = new Set(set);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        if (!this.notasPorExamen().has(id)) this.cargarNotasExamen(id);
      }
      return next;
    });
  }

  cargarNotasExamen(idExamen: number) {
    this.docenteService.getNotasExamen(idExamen).subscribe({
      next: data => this.notasPorExamen.update(m => new Map(m).set(idExamen, data)),
      error: (err) => console.error('[Exámenes] Error al cargar notas del examen:', err)
    });
  }

  iniciarEditNotaEx(idNota: number, notaActual: number | null) {
    this.editandoNotaEx.update(m => new Map(m).set(idNota, notaActual?.toString() ?? ''));
  }

  cancelarEditNotaEx(idNota: number) {
    this.editandoNotaEx.update(m => { const n = new Map(m); n.delete(idNota); return n; });
  }

  setEditNotaEx(idNota: number, valor: string) {
    this.editandoNotaEx.update(m => new Map(m).set(idNota, valor));
  }

  guardarNotaExamen(idNota: number, idExamen: number) {
    const notaStr = this.editandoNotaEx().get(idNota);
    const nota = notaStr !== undefined && notaStr !== '' ? parseFloat(notaStr) : null;
    if (nota !== null && isNaN(nota)) return;

    this.guardandoNotaEx.update(s => new Set(s).add(idNota));
    const body: Record<string, unknown> = {};
    if (nota !== null) body['nota'] = nota;

    this.docenteService.guardarNotaExamen(idNota, body).subscribe({
      next: updated => {
        this.notasPorExamen.update(m => {
          const notas = m.get(idExamen) ?? [];
          return new Map(m).set(idExamen, notas.map(n => n.idNotaExamen === idNota ? updated : n));
        });
        this.examenes.update(list => list.map(e => {
          if (e.id !== idExamen) return e;
          const all = this.notasPorExamen().get(idExamen) ?? [];
          return { ...e, calificados: all.filter(n => n.nota !== null).length };
        }));
        this.guardandoNotaEx.update(s => { const n = new Set(s); n.delete(idNota); return n; });
        this.cancelarEditNotaEx(idNota);
      },
      error: (err) => {
        console.error('[Exámenes] Error al guardar nota del examen:', err);
        this.guardandoNotaEx.update(s => { const n = new Set(s); n.delete(idNota); return n; });
      }
    });
  }

  toggleAsistio(idNota: number, idExamen: number, asistioActual: boolean) {
    this.notasPorExamen.update(m => {
      const notas = m.get(idExamen) ?? [];
      return new Map(m).set(idExamen,
        notas.map(n => n.idNotaExamen === idNota ? { ...n, asistio: !asistioActual } : n));
    });
    this.docenteService.registrarAsistenciaExamen(idNota, { asistio: !asistioActual }).subscribe({
      next: updated => {
        this.notasPorExamen.update(m => {
          const notas = m.get(idExamen) ?? [];
          return new Map(m).set(idExamen, notas.map(n => n.idNotaExamen === idNota ? updated : n));
        });
        this.examenes.update(list => list.map(e => {
          if (e.id !== idExamen) return e;
          const all = this.notasPorExamen().get(idExamen) ?? [];
          return { ...e,
            asistieron:   all.filter(n => n.asistio).length,
            noAsistieron: all.filter(n => !n.asistio).length,
          };
        }));
      },
      error: () => this.cargarNotasExamen(idExamen),
    });
  }

  /** Etiqueta legible del tipo de examen */
  labelTipoExamen(tipo: string): string {
    return ({ escrito: 'Escrito', oral: 'Oral', online: 'Online', practico: 'Práctico' } as Record<string, string>)[tipo] ?? tipo;
  }

  /* ── Métodos de Reportes ── */

  cargarReportes(idAulaCurso: number) {
    this.cargandoReportes.set(true);
    this.docenteService.getAlumnosReportes(idAulaCurso).subscribe({
      next: data => { this.reportesAlumnos.set(data); this.cargandoReportes.set(false); },
      error: ()   => this.cargandoReportes.set(false),
    });
  }

  toggleAlumnoReportes(idAlumno: number) {
    this.alumnosExpandidos.update(set => {
      const next = new Set(set);
      next.has(idAlumno) ? next.delete(idAlumno) : next.add(idAlumno);
      return next;
    });
  }

  toggleFormReporte(abrir: boolean) {
    if (abrir) {
      this.formReporte.set({
        idAlumno: null, tipo: 'anotacion',
        titulo: '', descripcion: '', fecha: '', visiblePadre: true
      });
    }
    this.mostrarFormReporte.set(abrir);
  }

  setFormReporte(campo: keyof FormReporte, valor: string | number | boolean | null) {
    this.formReporte.update(f => ({ ...f, [campo]: valor }));
  }

  enviarReporte() {
    const f = this.formReporte();
    if (!f.titulo.trim() || !f.idAlumno) return;
    const curso = this.cursoActivo();
    if (!curso) return;
    this.enviandoReporte.set(true);
    const body = {
      idAlumno:     f.idAlumno,
      tipo:         f.tipo,
      titulo:       f.titulo.trim(),
      descripcion:  f.descripcion?.trim() || null,
      fecha:        f.fecha || null,
      visiblePadre: f.visiblePadre,
    };
    this.docenteService.crearReporte(curso.idAulaCurso, body).subscribe({
      next: nuevoReporte => {
        /* Insertar localmente sin recargar todo */
        this.reportesAlumnos.update(list =>
          list.map(a => a.idAlumno === f.idAlumno
            ? { ...a, totalReportes: a.totalReportes + 1, reportes: [nuevoReporte, ...a.reportes] }
            : a
          )
        );
        /* Expandir al alumno del nuevo reporte */
        this.alumnosExpandidos.update(s => new Set(s).add(f.idAlumno!));
        this.enviandoReporte.set(false);
        this.mostrarFormReporte.set(false);
      },
      error: () => this.enviandoReporte.set(false),
    });
  }

  eliminarReporte(idReporte: number, idAlumno: number) {
    /* Optimistic update */
    this.reportesAlumnos.update(list =>
      list.map(a => a.idAlumno === idAlumno
        ? { ...a,
            totalReportes: a.totalReportes - 1,
            reportes: a.reportes.filter(r => r.id !== idReporte)
          }
        : a
      )
    );
    this.docenteService.eliminarReporte(idReporte).subscribe({
      error: () => {
        const curso = this.cursoActivo();
        if (curso) this.cargarReportes(curso.idAulaCurso);
      }
    });
  }

  toggleVisibilidadReporte(idReporte: number, idAlumno: number) {
    /* Optimistic update */
    this.reportesAlumnos.update(list =>
      list.map(a => a.idAlumno === idAlumno
        ? { ...a, reportes: a.reportes.map(r => r.id === idReporte ? { ...r, visiblePadre: !r.visiblePadre } : r) }
        : a
      )
    );
    this.docenteService.toggleVisibilidadReporte(idReporte).subscribe({
      next: updated => {
        this.reportesAlumnos.update(list =>
          list.map(a => a.idAlumno === idAlumno
            ? { ...a, reportes: a.reportes.map(r => r.id === idReporte ? updated : r) }
            : a
          )
        );
      },
      error: () => {
        const curso = this.cursoActivo();
        if (curso) this.cargarReportes(curso.idAulaCurso);
      }
    });
  }

  exportarCurso(formato: 'excel' | 'pdf') {
    const curso = this.cursoActivo();
    if (!curso) return;

    this.docenteService.exportarCursoBlob(curso.idAulaCurso, formato).subscribe({
      next: (blob) => {
        const type = formato === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf';
        const file = new Blob([blob], { type });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = `reporte_curso_${curso.nombre.toLowerCase().replace(/\s+/g, '_')}_${this.today}.${formato === 'excel' ? 'xlsx' : 'pdf'}`;
        link.click();
      },
      error: () => alert('Error al descargar el reporte académico del curso.')
    });
  }

  /* ── Métodos de Asistencia ── */

  /** Obtiene la fecha actual en formato YYYY-MM-DD */
  private hoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  cargarSesionAsistencia(idAulaCurso: number, fecha?: string) {
    const f = fecha ?? (this.fechaAsistencia() || this.hoy());
    this.fechaAsistencia.set(f);
    this.cargandoAsistencia.set(true);
    this.asistenciaModificada.set(false);
    this.docenteService.getSesionAsistencia(idAulaCurso, f).subscribe({
      next: data => {
        this.sesionAsistencia.set(data);
        this.asistenciaLocal.set(data.alumnos.map((a: AsistenciaAlumno) => ({ ...a })));
        this.cargandoAsistencia.set(false);
      },
      error: () => this.cargandoAsistencia.set(false),
    });
  }

  cargarFechasSesiones(idAulaCurso: number) {
    this.docenteService.getFechasAsistencias(idAulaCurso).subscribe({ next: data => this.fechasSesiones.set(data) });
  }

  cambiarFechaAsistencia(fecha: string) {
    const curso = this.cursoActivo();
    if (!curso) return;
    if (this.asistenciaModificada()) {
      if (!confirm('Hay cambios sin guardar. ¿Deseas descartarlos?')) return;
    }
    this.cargarSesionAsistencia(curso.idAulaCurso, fecha);
  }

  setEstadoAsistencia(idAlumno: number, estado: string) {
    this.asistenciaModificada.set(true);
    this.asistenciaLocal.update(list =>
      list.map(a => a.idAlumno === idAlumno
        ? { ...a, estado, justificante: estado !== 'justificado' ? null : a.justificante }
        : a
      )
    );
  }

  setJustificanteAsistencia(idAlumno: number, justificante: string) {
    this.asistenciaModificada.set(true);
    this.asistenciaLocal.update(list =>
      list.map(a => a.idAlumno === idAlumno ? { ...a, justificante } : a)
    );
  }

  marcarTodosPresentes() {
    this.asistenciaModificada.set(true);
    this.asistenciaLocal.update(list =>
      list.map(a => ({ ...a, estado: 'presente', justificante: null }))
    );
  }

  guardarAsistencia() {
    const curso = this.cursoActivo();
    if (!curso) return;
    this.guardandoAsistencia.set(true);
    const body = {
      fecha:   this.fechaAsistencia(),
      alumnos: this.asistenciaLocal().map(a => ({
        idAlumno:     a.idAlumno,
        estado:       a.estado,
        justificante: a.justificante || null,
      })),
    };
    this.docenteService.registrarAsistencias(curso.idAulaCurso, body).subscribe({
      next: data => {
        this.sesionAsistencia.set(data);
        this.asistenciaLocal.set(data.alumnos.map((a: AsistenciaAlumno) => ({ ...a })));
        this.guardandoAsistencia.set(false);
        this.asistenciaModificada.set(false);
        this.cargarFechasSesiones(curso.idAulaCurso);
      },
      error: () => this.guardandoAsistencia.set(false),
    });
  }

  /** Helpers para stats locales (calculados sobre asistenciaLocal) */
  asistenciaStats() {
    const list = this.asistenciaLocal();
    return {
      presentes:    list.filter(a => a.estado === 'presente').length,
      faltas:       list.filter(a => a.estado === 'falta').length,
      tardanzas:    list.filter(a => a.estado === 'tardanza').length,
      justificados: list.filter(a => a.estado === 'justificado').length,
    };
  }

  /** Formato legible de fecha YYYY-MM-DD → "Mié 21 May" */
  formatFechaCorta(fechaStr: string): string {
    if (!fechaStr) return '';
    const d = new Date(fechaStr + 'T12:00:00');
    return d.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  /** Formato legible largo YYYY-MM-DD → "Domingo, 28 De Junio" */
  formatFechaLarga(fechaStr: string): string {
    if (!fechaStr) return '';
    const d = new Date(fechaStr + 'T12:00:00');
    const parts = d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' }).split(', ');
    if (parts.length > 1) {
      return parts[0].charAt(0).toUpperCase() + parts[0].slice(1) + ', ' + parts[1].replace('de ', 'De ');
    }
    return d.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  verConsolidado() {
    const act = !this.mostrarConsolidado();
    this.mostrarConsolidado.set(act);
    if (act) {
      if (!this.mesConsolidado()) {
        const d = new Date();
        this.mesConsolidado.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      }
      this.cargarConsolidado();
    }
  }



  cargarConsolidado() {
    const curso = this.cursoActivo();
    if (!curso) return;
    this.cargandoConsolidado.set(true);
    this.docenteService.getAsistenciaConsolidado(curso.idAulaCurso, this.mesConsolidado()).subscribe({
      next: (res) => {
        this.datosConsolidado.set(res);
        this.cargandoConsolidado.set(false);
      },
      error: () => {
        this.cargandoConsolidado.set(false);
      }
    });
  }

  cambiarMesConsolidado(deltaMeses: number) {
    const actual = this.mesConsolidado();
    if (!actual) return;
    const [y, m] = actual.split('-').map(Number);
    const d = new Date(y, m - 1 + deltaMeses, 1);
    this.mesConsolidado.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    this.cargarConsolidado();
  }

  formatMes(mesYYYYMM: string): string {
    if (!mesYYYYMM) return '';
    const [y, m] = mesYYYYMM.split('-').map(Number);
    const d = new Date(y, m - 1, 1);
    const str = d.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' });
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /** Cuenta cuántos reportes de un tipo tiene un alumno */
  contarTipoReporte(reportes: Reporte[], tipo: string): number {
    return reportes.filter(r => r.tipo === tipo).length;
  }

  /** Etiqueta e info de color para el tipo de reporte */
  tipoReporteInfo(tipo: string): { label: string; css: string } {
    const map: Record<string, { label: string; css: string }> = {
      pendiente:        { label: 'Pendiente',         css: 'rp-tipo-pendiente'   },
      anotacion:        { label: 'Anotación',         css: 'rp-tipo-anotacion'   },
      llamada_atencion: { label: 'Llamada de Atención', css: 'rp-tipo-atencion' },
      felicitacion:     { label: 'Felicitación',      css: 'rp-tipo-felicitacion'},
      otro:             { label: 'Otro',               css: 'rp-tipo-otro'       },
    };
    return map[tipo] ?? { label: tipo, css: 'rp-tipo-otro' };
  }

  /* ── Métodos de Pendientes ── */

  prioridadPendiente(item: Pendiente): { label: string; css: string } {
    const ratio = item.sinCalificar / (item.totalAlumnos || 1);
    if (ratio > 0.5) return { label: 'ALTA', css: 'pd-prio-alta' };
    if (ratio > 0.2) return { label: 'MEDIA', css: 'pd-prio-media' };
    return { label: 'BAJA', css: 'pd-prio-baja' };
  }

  cargarPendientes() {
    this.docenteService.getPendientes().subscribe({ next: data => this.pendientes.set(data) });
  }

  cargarAlertasCriticas() {
    this.docenteService.getPrediccionesGlobales().subscribe({
      next: (data) => {
        const alertas: AlertaCritica[] = [];
        data.forEach(al => {
          if (al.promedio > 0 && al.promedio < 11) {
            alertas.push({
              idAlumno: al.idAlumno,
              nombre: `${al.nombre} ${al.apellido}`,
              descripcion: `Promedio bajo en ${al.curso} (${al.promedio})`,
              tipo: 'rendimiento',
              inicial: al.nombre[0] + al.apellido[0],
              color: '#ef476f'
            });
          }
          if (al.totalClases > 0) {
            const pct = (al.clasesPresente / al.totalClases) * 100;
            if (pct < 85) {
              alertas.push({
                idAlumno: al.idAlumno,
                nombre: `${al.nombre} ${al.apellido}`,
                descripcion: `Baja asistencia en ${al.curso} (${Math.round(pct)}%)`,
                tipo: 'asistencia',
                inicial: al.nombre[0] + al.apellido[0],
                color: '#f4a261'
              });
            }
          }
        });
        this.alertasCriticas.set(alertas);
      }
    });
  }

  aplicarAccionRapida(tipo: 'citacion' | 'inasistencia' | 'rendimiento' | 'recuperacion') {
    const ctx = this.contextoAlumno();
    if (!ctx) return;

    let msg = '';
    const alumnoNombre = `${ctx.nombre} ${ctx.apellido}`;
    
    if (tipo === 'citacion') {
      msg = `Estimado apoderado(a) de ${alumnoNombre}, solicito coordinar una citación formal para conversar detalladamente sobre su progreso académico en el curso de ${ctx.curso}. Quedo atento a su disponibilidad horaria. Atte. Prof. ${this.nombre}.`;
    } else if (tipo === 'inasistencia') {
      msg = `Estimado apoderado(a), le informo que su hijo(a) ${alumnoNombre} registró una inasistencia a la clase de ${ctx.curso} en la fecha de hoy. Agradeceré enviar la justificación correspondiente a la brevedad. Saludos cordiales.`;
    } else if (tipo === 'rendimiento') {
      msg = `Estimado apoderado(a), le escribo para notificarle que ${alumnoNombre} ha presentado notas por debajo del promedio regular en el curso de ${ctx.curso} (Promedio actual: ${ctx.promedio}). Le recomiendo revisar el material de Refuerzo Académico disponible en el portal del alumno.`;
    } else if (tipo === 'recuperacion') {
      msg = `Estimado apoderado(a), le informo que ${alumnoNombre} ha culminado con éxito las tareas y talleres de recuperación planificados para esta semana en ${ctx.curso}, mostrando una excelente actitud y mejora en su desempeño. ¡Felicitaciones!`;
    }

    this.replyText.set(msg);
    this.enviarRespuesta();
  }

  /**
   * Navega al curso correspondiente al pendiente y abre el tab correcto.
   * Si el curso aún no está cargado, espera a que cursos() tenga datos.
   */
  irAPendiente(item: Pendiente) {
    const curso = this.cursos().find(c => c.idAulaCurso === item.idAulaCurso);
    if (!curso) return;
    this.abrirCurso(curso);
    const tab = item.tipo === 'tarea' ? 'tareas' : 'examenes';
    this.activeSubTab.set(tab);
  }

  setSection(id: string)   { this.activeSection.set(id);   this.dropdownOpen.set(false); }
  setGrade(grado: string)  { this.activeGrade.set(grado);  }
  setYear(year: string)    { this.selectedYear.set(year);  }
  toggleDropdown()         { this.dropdownOpen.update(v => !v); }

  iniciarComunicacionConPadre(idAlumno: number) {
    this.setSection('mensajes');
    this.modalNuevoChat.set(true);
    this.nuevoChatGrado.set('');
    this.nuevoChatSeccion.set('');
    this.nuevoChatBusqueda.set('');
    this.nuevoChatAlumnoSel.set(null);
    this.nuevoChatAsunto.set('');
    this.nuevoChatMensaje.set('');

    const preselect = () => {
      const alumno = this.alumnosDisponibles().find(a => a.idAlumno === idAlumno);
      if (alumno) {
        this.seleccionarAlumnoModal(alumno);
      }
    };

    if (this.alumnosDisponibles().length === 0) {
      this.cargandoAlumnos.set(true);
      this.docenteService.getAlumnosDisponibles().subscribe({
        next: data => {
          this.alumnosDisponibles.set(data);
          this.cargandoAlumnos.set(false);
          preselect();
        },
        error: () => { this.cargandoAlumnos.set(false); }
      });
    } else {
      preselect();
    }
  }

  crearMaterialDeForm(form: FormMaterial) {
    this.formMaterial.set(form);
    this.enviarMaterial();
  }

  crearTareaDeForm(form: FormTarea) {
    this.formTarea.set(form);
    this.enviarTarea();
  }

  crearExamenDeForm(form: FormExamen) {
    this.formExamen.set(form);
    this.enviarExamen();
  }

  crearUnidadDeForm(form: FormUnidad) {
    this.formUnidad.set(form);
    this.guardarUnidad();
  }

  crearReporteDeForm(form: FormReporte) {
    this.formReporte.set(form);
    this.enviarReporte();
  }

  guardarNotaAlumnoDeForm(idNota: number, idTarea: number, nota: number) {
    this.editandoNota.update(m => new Map(m).set(idNota, nota.toString()));
    this.guardarNotaAlumno(idNota, idTarea);
  }

  guardarNotaExamenDeForm(idNotaExamen: number, idExamen: number, nota: number) {
    this.editandoNotaEx.update(m => new Map(m).set(idNotaExamen, nota.toString()));
    this.guardarNotaExamen(idNotaExamen, idExamen);
  }

  setFormReservaDeComponent(e: { campo: string, valor: any }) {
    this.formReserva.update(form => ({ ...form, [e.campo]: e.valor }));
  }

  setFormComDeComponent(e: { campo: string, valor: any }) {
    this.formCom.update(form => ({ ...form, [e.campo]: e.valor }));
  }


  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.pd-avatar-wrapper')) {
      this.dropdownOpen.set(false);
    }
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
