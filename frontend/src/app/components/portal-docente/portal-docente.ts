import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export interface Curso {
  idAulaCurso: number;
  nombre: string;
  grado: string;
  seccion: string;
  color: string;
  iconType: string;
  badge: string;
  horasSemana: number;
  totalAlumnos: number;
}

interface CursoApi {
  idAulaCurso: number;
  nombre: string;
  grado: string;
  seccion: string;
  horasSemana: number;
  turno: string;
  periodo: string;
  totalAlumnos: number;
}

/* ── Interfaces de mensajería ── */

/** Resumen de un mensaje para la lista (bandeja de entrada) */
export interface MensajeResumen {
  id: number;
  asunto: string;
  tipo: string;             // 'justificante' | 'consulta' | 'otro'
  leido: boolean;
  fechaEnvio: string;       // "DD/MM/YYYY HH:MM"
  nombrePadre: string;
  nombreAlumno: string | null;
  idAlumno: number | null;
  grado: string | null;
  seccion: string | null;
  curso: string | null;
  cantRespuestas: number;
  ultimaRespuesta: string | null;
}

/** Una respuesta dentro del hilo de un mensaje */
export interface RespuestaResumen {
  id: number;
  cuerpo: string;
  fecha: string;
  nombreAutor: string;
  esMaestro: boolean;
}

/** Detalle completo de un mensaje (incluye cuerpo + hilo de respuestas) */
export interface MensajeDetalle extends MensajeResumen {
  cuerpo: string;
  respuestas: RespuestaResumen[];
}

/** Contexto del alumno para el panel lateral en mensajes */
export interface AlumnoContexto {
  idAlumno: number;
  nombre: string;
  apellido: string;
  grado: string;
  seccion: string;
  curso: string;
  nombrePadre: string;
  emailPadre: string;
  totalClases: number;
  clasesPresente: number;
  tareasPendientes: number;
  promedio: number;
}

/** Estructura que devuelve el endpoint GET /api/portal/docente/mi-horario */
export interface ClaseHorario {
  dia: number;        // 1=Lunes … 5=Viernes
  diaNombre: string;  // "Lunes", "Martes"…
  horaInicio: string; // "07:30"
  horaFin:    string; // "09:00"
  curso:      string;
  grado:      string;
  seccion:    string;
}

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

export interface Pendiente {
  idAulaCurso:  number;
  tipo:         string;    // 'tarea' | 'examen'
  grado:        string;
  seccion:      string;
  curso:        string;
  titulo:       string;
  sinCalificar: number;
  totalAlumnos: number;
}

/* ── Interfaces de detalle de curso ── */

/** Material didáctico de una semana/clase */
export interface Material {
  id: number;
  semana: number;
  clase: number;
  titulo: string;
  tipo: string;          // 'pdf' | 'word' | 'video' | 'url' | 'youtube'
  url: string | null;
  fechaCreacion: string; // "DD/MM/YYYY"
}

/** Nodo de clase con sus materiales (para el árbol de contenido) */
export interface ClaseNodo {
  clase: number;
  items: Material[];
}

/** Nodo de semana con sus clases (para el árbol de contenido) */
export interface SemanaNodo {
  semana: number;
  clases: ClaseNodo[];
}

/** Estado del formulario del modal Subir Material */
export interface FormMaterial {
  semana: number;
  clase: number;
  titulo: string;
  tipo: string;   // 'pdf' | 'word' | 'video' | 'url' | 'youtube'
  url: string;
}

/* ── Interfaces de Tareas ── */

export interface Tarea {
  id: number;
  numeroTarea: number;
  semana: number;
  clase: number;
  titulo: string;
  descripcion: string | null;
  tipoEntregable: string | null;
  fechaEntrega: string | null;   // "DD/MM/YYYY"
  notaMaxima: number;
  intentos: number;
  url: string | null;
  fechaCreacion: string;
  totalAlumnos: number;
  entregadas: number;
  noEntregadas: number;
}

export interface NotaTarea {
  idNota: number;
  idAlumno: number;
  codigo: string;
  nombres: string;
  entregado: boolean;
  nota: number | null;
}

export interface FormTarea {
  semana: number;
  clase: number;
  numeroTarea: number;
  titulo: string;
  descripcion: string;
  tipoEntregable: string;
  fechaEntrega: string;   // 'YYYY-MM-DD'
  notaMaxima: number;
  intentos: number;
  url: string;
}

/* ── Interfaces de Exámenes ── */

export interface Examen {
  id: number;
  numeroExamen: number;
  semana: number;
  clase: number;
  titulo: string;
  descripcion: string | null;
  tipo: string;              // escrito | oral | online | practico
  fechaExamen: string | null;
  duracionMinutos: number | null;
  notaMaxima: number;
  url: string | null;
  fechaCreacion: string;
  totalAlumnos: number;
  asistieron: number;
  noAsistieron: number;
  calificados: number;
}

export interface NotaExamen {
  idNotaExamen: number;
  idAlumno: number;
  codigo: string;
  nombres: string;
  asistio: boolean;
  nota: number | null;
}

export interface FormExamen {
  semana: number;
  clase: number;
  numeroExamen: number;
  titulo: string;
  descripcion: string;
  tipo: string;
  fechaExamen: string;
  duracionMinutos: number;
  notaMaxima: number;
  url: string;
}

/* ── Interfaces de Reportes ── */

export interface Reporte {
  id: number;
  tipo: string;          // pendiente | anotacion | llamada_atencion | felicitacion | otro
  titulo: string;
  descripcion: string | null;
  fecha: string;
  visiblePadre: boolean;
  fechaCreacion: string;
}

export interface AlumnoReportes {
  idAlumno: number;
  codigo: string;
  nombres: string;
  totalReportes: number;
  reportes: Reporte[];
}

export interface FormReporte {
  idAlumno: number | null;
  tipo: string;
  titulo: string;
  descripcion: string;
  fecha: string;
  visiblePadre: boolean;
}

/* ── Interfaces de Asistencia ── */

export interface AsistenciaAlumno {
  idAsistencia: number | null;
  idAlumno:     number;
  codigo:       string;
  nombres:      string;
  estado:       string;    // presente | falta | tardanza | justificado
  justificante: string | null;
}

export interface SesionAsistencia {
  fecha:             string;
  totalPresentes:    number;
  totalFaltas:       number;
  totalTardanzas:    number;
  totalJustificados: number;
  alumnos:           AsistenciaAlumno[];
}

/* ── Interfaces de comunicados (Refuerzos) ── */

/** Aula del docente: id + grado + sección, para el selector del formulario */
export interface AulaSimple {
  id: number;
  grado: string;
  seccion: string;
}

/** Comunicado creado por el docente */
export interface Comunicado {
  id: number;
  titulo: string;
  descripcion: string | null;
  tipo: string;           // 'examen' | 'actividad' | 'reunion_padres' | 'paseo' | 'dia_festivo' | 'general'
  fechaEvento: string | null;   // "DD/MM/YYYY"
  fechaCreacion: string;        // "DD/MM/YYYY HH:MM"
  grado: string;                // grado o "Todos los grados"
  seccion: string | null;
  idAula: number | null;
}

/** Estado local del formulario de nuevo comunicado */
export interface FormComunicado {
  titulo: string;
  tipo: string;
  idAula: number | null;   // null = todos los grados
  descripcion: string;
  fechaEvento: string;     // "YYYY-MM-DD" (formato input[type=date])
}

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
  imports: [CommonModule, FormsModule],
  templateUrl: './portal-docente.html',
  styleUrl: './portal-docente.scss',
})
export class PortalDocente {
  private router = inject(Router);
  private auth   = inject(AuthService);
  private http   = inject(HttpClient);

  activeSection = signal('inicio');
  activeGrade   = signal('Todos');
  selectedYear  = signal('2026');
  dropdownOpen  = signal(false);
  cargando      = signal(false);
  errorCarga    = signal('');

  nombre    = this.auth.getNombre() ?? 'Docente';
  codigo    = this.auth.getCodigo() ?? '';
  iniciales = this.nombre.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();

  navItems = [
    { id: 'inicio',      label: 'Inicio'     },
    { id: 'calendario',  label: 'Calendario' },
    { id: 'mensajes',    label: 'Mensajes'   },
    { id: 'refuerzos',   label: 'Refuerzos'  },
  ];

  years = ['2024', '2025', '2026'];

  cursos       = signal<Curso[]>([]);
  pendientes   = signal<Pendiente[]>([]);

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
  /** Panel contexto alumno: datos + estado de carga */
  contextoAlumno     = signal<AlumnoContexto | null>(null);
  cargandoContexto   = signal(false);
  mostrarContexto    = signal(false);

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
  activeSubTab     = signal('contenido');  // 'asistencia' | 'contenido' | 'tareas' | 'examenes' | 'reportes'
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

  /* ── Signals de Asistencia ── */

  sesionAsistencia    = signal<SesionAsistencia | null>(null);
  cargandoAsistencia  = signal(false);
  guardandoAsistencia = signal(false);
  asistenciaModificada = signal(false);
  fechaAsistencia     = signal<string>('');
  fechasSesiones      = signal<string[]>([]);
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
  /** Estado del formulario de nuevo comunicado */
  formCom = signal<FormComunicado>({
    titulo: '', tipo: 'examen', idAula: null, descripcion: '', fechaEvento: ''
  });

  /** Grados únicos en los comunicados para los tabs de filtro */
  gradosComunicados = computed(() => {
    const grados = this.comunicados()
      .map(c => c.grado)
      .filter(g => g !== 'Todos los grados');
    return [...new Set(grados)];
  });

  /** Comunicados filtrados por grado seleccionado */
  comunicadosFiltrados = computed(() => {
    const f = this.filtroGradoCom();
    if (!f) return this.comunicados();
    return this.comunicados().filter(c => c.grado === f || c.idAula === null);
  });

  /* ── Signals del calendario ── */

  /** Todos los bloques de clase devueltos por el backend */
  horario          = signal<ClaseHorario[]>([]);
  cargandoHorario  = signal(false);
  errorHorario     = signal('');

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

  grades = computed(() => {
    const base   = ['Todos'];
    const unique = [...new Set(this.cursos().map(c => c.grado))];
    return [...base, ...unique];
  });

  filteredCursos = computed(() => {
    if (this.activeGrade() === 'Todos') return this.cursos();
    return this.cursos().filter(c => c.grado === this.activeGrade());
  });

  constructor() {
    this.cargarCursos();
    this.cargarHorario();
    this.cargarMensajes();
    this.cargarComunicados();
    this.cargarMisAulas();
    this.cargarPendientes();
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
     CARGA DE DATOS
  ══════════════════════════════════════════ */

  private cargarCursos() {
    const token = this.auth.getToken();
    if (!token) return;

    this.cargando.set(true);
    this.errorCarga.set('');

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<CursoApi[]>('http://localhost:8080/api/portal/docente/mis-cursos', { headers })
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
    const token = this.auth.getToken();
    if (!token) return;
    this.cargandoMensajes.set(true);
    this.errorMensajes.set('');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<MensajeResumen[]>('http://localhost:8080/api/portal/docente/mensajes', { headers })
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
    const token = this.auth.getToken();
    if (!token) return;
    this.mensajeActivo.set(null);
    this.contextoAlumno.set(null);
    this.mostrarContexto.set(false);
    this.replyText.set('');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<MensajeDetalle>(`http://localhost:8080/api/portal/docente/mensajes/${id}`, { headers })
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
        },
      });
  }

  /** Carga el resumen del alumno para el panel lateral */
  cargarContextoAlumno(idAlumno: number) {
    const token = this.auth.getToken();
    if (!token) return;
    this.cargandoContexto.set(true);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<AlumnoContexto>(
      `http://localhost:8080/api/portal/docente/mensajes/alumno-contexto/${idAlumno}`, { headers }
    ).subscribe({
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

  /** % de asistencia del alumno activo */
  pctAsistencia(): number {
    const ctx = this.contextoAlumno();
    if (!ctx || ctx.totalClases === 0) return 0;
    return Math.round((ctx.clasesPresente / ctx.totalClases) * 100);
  }

  /**
   * Envía la respuesta del docente al hilo activo.
   * Tras el éxito, recarga el detalle para mostrar la nueva respuesta.
   */
  enviarRespuesta() {
    const activo = this.mensajeActivo();
    const texto  = this.replyText().trim();
    if (!activo || !texto) return;
    const token = this.auth.getToken();
    if (!token) return;
    this.enviandoReply.set(true);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    this.http.post(`http://localhost:8080/api/portal/docente/mensajes/${activo.id}/responder`,
      { cuerpo: texto }, { headers })
      .subscribe({
        next: () => {
          this.replyText.set('');
          this.enviandoReply.set(false);
          /* Recargar el detalle para mostrar la nueva respuesta en el hilo */
          this.abrirMensaje(activo.id);
        },
        error: () => { this.enviandoReply.set(false); },
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
    const token = this.auth.getToken();
    if (!token) return;
    this.cargandoComunicados.set(true);
    this.errorComunicados.set('');
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<Comunicado[]>('http://localhost:8080/api/portal/docente/comunicados', { headers })
      .subscribe({
        next: data => { this.comunicados.set(data); this.cargandoComunicados.set(false); },
        error: ()   => { this.errorComunicados.set('No se pudieron cargar los comunicados.'); this.cargandoComunicados.set(false); },
      });
  }

  /** Carga las aulas del docente para poblar el selector del formulario */
  private cargarMisAulas() {
    const token = this.auth.getToken();
    if (!token) return;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<AulaSimple[]>('http://localhost:8080/api/portal/docente/comunicados/mis-aulas', { headers })
      .subscribe({ next: data => this.misAulas.set(data) });
  }

  /** Abre/cierra el formulario y lo resetea al abrir */
  toggleFormCom() {
    const abrir = !this.mostrarFormCom();
    if (abrir) {
      this.formCom.set({ titulo: '', tipo: 'examen', idAula: null, descripcion: '', fechaEvento: '' });
    }
    this.mostrarFormCom.set(abrir);
  }

  /** Actualiza un campo del formulario de comunicado de forma reactiva */
  setFormCom(campo: keyof FormComunicado, valor: string | number | null) {
    this.formCom.update(f => ({ ...f, [campo]: valor }));
  }

  /**
   * Envía el formulario al backend para crear el comunicado.
   * Al recibir el nuevo DTO lo inserta al inicio de la lista local
   * (sin recargar todos) y cierra el formulario.
   */
  enviarComunicado() {
    const f = this.formCom();
    if (!f.titulo.trim() || !f.tipo) return;
    const token = this.auth.getToken();
    if (!token) return;
    this.enviandoCom.set(true);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    const body = {
      titulo:      f.titulo.trim(),
      tipo:        f.tipo,
      idAula:      f.idAula,
      descripcion: f.descripcion.trim() || null,
      fechaEvento: f.fechaEvento || null,
    };
    this.http.post<Comunicado>('http://localhost:8080/api/portal/docente/comunicados', body, { headers })
      .subscribe({
        next: nuevo => {
          /* Insertar al principio y reordenar por fecha_evento */
          this.comunicados.update(lista => [nuevo, ...lista]);
          this.mostrarFormCom.set(false);
          this.enviandoCom.set(false);
          this.cargarComunicados(); /* recargar para tener orden correcto del backend */
        },
        error: () => { this.enviandoCom.set(false); },
      });
  }

  /**
   * Elimina un comunicado por id.
   * Lo quita de la lista local antes de llamar al backend (optimistic update).
   */
  eliminarComunicado(id: number) {
    const token = this.auth.getToken();
    if (!token) return;
    this.comunicados.update(lista => lista.filter(c => c.id !== id));
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.delete(`http://localhost:8080/api/portal/docente/comunicados/${id}`, { headers })
      .subscribe({ error: () => this.cargarComunicados() /* revertir si falla */ });
  }

  /** Devuelve el color CSS del tipo de comunicado para el badge */
  colorTipo(tipo: string): string {
    const mapa: Record<string, string> = {
      examen:          '#fee2e2',
      actividad:       '#dbeafe',
      reunion_padres:  '#d1fae5',
      paseo:           '#fef9c3',
      dia_festivo:     '#ede9fe',
      general:         '#f3f4f6',
    };
    return mapa[tipo] ?? '#f3f4f6';
  }

  /** Devuelve el color de texto del badge de tipo */
  colorTipoTexto(tipo: string): string {
    const mapa: Record<string, string> = {
      examen:          '#991b1b',
      actividad:       '#1e40af',
      reunion_padres:  '#065f46',
      paseo:           '#713f12',
      dia_festivo:     '#4c1d95',
      general:         '#374151',
    };
    return mapa[tipo] ?? '#374151';
  }

  /** Devuelve el label legible del tipo de comunicado */
  labelTipo(tipo: string): string {
    const mapa: Record<string, string> = {
      examen:          'Examen',
      actividad:       'Actividad',
      reunion_padres:  'Reunión de Padres',
      paseo:           'Paseo Escolar',
      dia_festivo:     'Día Festivo',
      general:         'General',
    };
    return mapa[tipo] ?? tipo;
  }

  /** Llama al endpoint /mi-horario y guarda los bloques en el signal `horario` */
  private cargarHorario() {
    const token = this.auth.getToken();
    if (!token) return;

    this.cargandoHorario.set(true);
    this.errorHorario.set('');

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<ClaseHorario[]>('http://localhost:8080/api/portal/docente/mi-horario', { headers })
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
    this.activeSubTab.set('contenido');
    this.semanasAbiertas.set(new Set([1]));
    this.clasesAbiertas.set(new Set(['1-1']));
    this.cargarMateriales(curso.idAulaCurso);
    this.cargarTareas(curso.idAulaCurso);
    this.cargarExamenes(curso.idAulaCurso);
    this.cargarReportes(curso.idAulaCurso);
    this.fechaAsistencia.set(this.hoy());
    this.cargarSesionAsistencia(curso.idAulaCurso);
    this.cargarFechasSesiones(curso.idAulaCurso);
  }

  /** Vuelve a la sección inicio y limpia el estado del curso activo */
  volverAlInicio() {
    this.cursoActivo.set(null);
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

  /** Carga los materiales del aula_curso dado */
  cargarMateriales(idAulaCurso: number) {
    const token = this.auth.getToken();
    if (!token) return;
    this.cargandoMat.set(true);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<Material[]>(
      `http://localhost:8080/api/portal/docente/cursos/${idAulaCurso}/materiales`,
      { headers }
    ).subscribe({
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
    const token = this.auth.getToken();
    if (!token) return;
    this.enviandoMat.set(true);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    const body = {
      semana: f.semana,
      clase:  f.clase,
      titulo: f.titulo.trim(),
      tipo:   f.tipo,
      url:    f.url?.trim() || null,
    };
    this.http.post<Material>(
      `http://localhost:8080/api/portal/docente/cursos/${curso.idAulaCurso}/materiales`,
      body, { headers }
    ).subscribe({
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
    const token = this.auth.getToken();
    if (!token) return;
    const curso = this.cursoActivo();
    this.materiales.update(list => list.filter(m => m.id !== id));
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.delete(
      `http://localhost:8080/api/portal/docente/cursos/materiales/${id}`,
      { headers }
    ).subscribe({ error: () => curso && this.cargarMateriales(curso.idAulaCurso) });
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
    const token = this.auth.getToken();
    if (!token) return;
    this.cargandoTareas.set(true);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<Tarea[]>(
      `http://localhost:8080/api/portal/docente/cursos/${idAulaCurso}/tareas`,
      { headers }
    ).subscribe({
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
    const token = this.auth.getToken();
    if (!token) return;
    this.enviandoTarea.set(true);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
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
    this.http.post<Tarea>(
      `http://localhost:8080/api/portal/docente/cursos/${curso.idAulaCurso}/tareas`,
      body, { headers }
    ).subscribe({
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
    const token = this.auth.getToken();
    if (!token) return;
    const curso = this.cursoActivo();
    this.tareas.update(list => list.filter(t => t.id !== id));
    /* Limpiar notas y estado de expansión */
    this.tareasExpandidas.update(s => { const n = new Set(s); n.delete(id); return n; });
    this.notasPorTarea.update(m => { const n = new Map(m); n.delete(id); return n; });
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.delete(
      `http://localhost:8080/api/portal/docente/tareas/${id}`, { headers }
    ).subscribe({ error: () => curso && this.cargarTareas(curso.idAulaCurso) });
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
    const token = this.auth.getToken();
    if (!token) return;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<NotaTarea[]>(
      `http://localhost:8080/api/portal/docente/tareas/${idTarea}/notas`,
      { headers }
    ).subscribe({
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
    const token = this.auth.getToken();
    if (!token) return;
    const editMap = this.editandoNota();
    const notaStr = editMap.get(idNota);
    const nota = notaStr !== undefined && notaStr !== '' ? parseFloat(notaStr) : null;
    if (nota !== null && isNaN(nota)) return;

    this.guardandoNota.update(s => new Set(s).add(idNota));
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    const body: Record<string, unknown> = {};
    if (nota !== null) body['nota'] = nota;
    if (entregado !== undefined) body['entregado'] = entregado;

    this.http.patch<NotaTarea>(
      `http://localhost:8080/api/portal/docente/tareas/notas/${idNota}`,
      body, { headers }
    ).subscribe({
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
    const token = this.auth.getToken();
    if (!token) return;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    /* Optimistic update */
    this.notasPorTarea.update(m => {
      const notas = m.get(idTarea) ?? [];
      return new Map(m).set(idTarea,
        notas.map(n => n.idNota === idNota ? { ...n, entregado: !entregadoActual } : n));
    });
    this.http.patch<NotaTarea>(
      `http://localhost:8080/api/portal/docente/tareas/notas/${idNota}`,
      { entregado: !entregadoActual }, { headers }
    ).subscribe({ error: () => this.cargarNotasTarea(idTarea) });
  }

  /* ── Métodos de Exámenes ── */

  cargarExamenes(idAulaCurso: number) {
    const token = this.auth.getToken();
    if (!token) return;
    this.cargandoExamenes.set(true);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<Examen[]>(
      `http://localhost:8080/api/portal/docente/cursos/${idAulaCurso}/examenes`,
      { headers }
    ).subscribe({
      next: data => { this.examenes.set(data); this.cargandoExamenes.set(false); },
      error: ()   => this.cargandoExamenes.set(false),
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
    const token = this.auth.getToken();
    if (!token) return;
    this.enviandoExamen.set(true);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
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
    this.http.post<Examen>(
      `http://localhost:8080/api/portal/docente/cursos/${curso.idAulaCurso}/examenes`,
      body, { headers }
    ).subscribe({
      next: () => {
        this.mostrarFormExamen.set(false);
        this.enviandoExamen.set(false);
        this.cargarExamenes(curso.idAulaCurso);
      },
      error: () => this.enviandoExamen.set(false),
    });
  }

  eliminarExamen(id: number) {
    const token = this.auth.getToken();
    if (!token) return;
    const curso = this.cursoActivo();
    this.examenes.update(list => list.filter(e => e.id !== id));
    this.examenesExpandidos.update(s => { const n = new Set(s); n.delete(id); return n; });
    this.notasPorExamen.update(m => { const n = new Map(m); n.delete(id); return n; });
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.delete(
      `http://localhost:8080/api/portal/docente/examenes/${id}`, { headers }
    ).subscribe({ error: () => curso && this.cargarExamenes(curso.idAulaCurso) });
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
    const token = this.auth.getToken();
    if (!token) return;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<NotaExamen[]>(
      `http://localhost:8080/api/portal/docente/examenes/${idExamen}/notas`,
      { headers }
    ).subscribe({
      next: data => this.notasPorExamen.update(m => new Map(m).set(idExamen, data)),
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
    const token = this.auth.getToken();
    if (!token) return;
    const notaStr = this.editandoNotaEx().get(idNota);
    const nota = notaStr !== undefined && notaStr !== '' ? parseFloat(notaStr) : null;
    if (nota !== null && isNaN(nota)) return;

    this.guardandoNotaEx.update(s => new Set(s).add(idNota));
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    const body: Record<string, unknown> = {};
    if (nota !== null) body['nota'] = nota;

    this.http.patch<NotaExamen>(
      `http://localhost:8080/api/portal/docente/examenes/notas/${idNota}`,
      body, { headers }
    ).subscribe({
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
      error: () => this.guardandoNotaEx.update(s => { const n = new Set(s); n.delete(idNota); return n; }),
    });
  }

  toggleAsistio(idNota: number, idExamen: number, asistioActual: boolean) {
    const token = this.auth.getToken();
    if (!token) return;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    this.notasPorExamen.update(m => {
      const notas = m.get(idExamen) ?? [];
      return new Map(m).set(idExamen,
        notas.map(n => n.idNotaExamen === idNota ? { ...n, asistio: !asistioActual } : n));
    });
    this.http.patch<NotaExamen>(
      `http://localhost:8080/api/portal/docente/examenes/notas/${idNota}`,
      { asistio: !asistioActual }, { headers }
    ).subscribe({
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
    const token = this.auth.getToken();
    if (!token) return;
    this.cargandoReportes.set(true);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<AlumnoReportes[]>(
      `http://localhost:8080/api/portal/docente/cursos/${idAulaCurso}/reportes`,
      { headers }
    ).subscribe({
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
    const token = this.auth.getToken();
    if (!token) return;
    this.enviandoReporte.set(true);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    const body = {
      idAlumno:     f.idAlumno,
      tipo:         f.tipo,
      titulo:       f.titulo.trim(),
      descripcion:  f.descripcion?.trim() || null,
      fecha:        f.fecha || null,
      visiblePadre: f.visiblePadre,
    };
    this.http.post<Reporte>(
      `http://localhost:8080/api/portal/docente/cursos/${curso.idAulaCurso}/reportes`,
      body, { headers }
    ).subscribe({
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
    const token = this.auth.getToken();
    if (!token) return;
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
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.delete(
      `http://localhost:8080/api/portal/docente/reportes/${idReporte}`, { headers }
    ).subscribe({
      error: () => {
        const curso = this.cursoActivo();
        if (curso) this.cargarReportes(curso.idAulaCurso);
      }
    });
  }

  toggleVisibilidadReporte(idReporte: number, idAlumno: number) {
    const token = this.auth.getToken();
    if (!token) return;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    /* Optimistic update */
    this.reportesAlumnos.update(list =>
      list.map(a => a.idAlumno === idAlumno
        ? { ...a, reportes: a.reportes.map(r => r.id === idReporte ? { ...r, visiblePadre: !r.visiblePadre } : r) }
        : a
      )
    );
    this.http.patch<Reporte>(
      `http://localhost:8080/api/portal/docente/reportes/${idReporte}/visibilidad`,
      {}, { headers }
    ).subscribe({
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

  /* ── Métodos de Asistencia ── */

  /** Obtiene la fecha actual en formato YYYY-MM-DD */
  private hoy(): string {
    return new Date().toISOString().split('T')[0];
  }

  cargarSesionAsistencia(idAulaCurso: number, fecha?: string) {
    const token = this.auth.getToken();
    if (!token) return;
    const f = fecha ?? (this.fechaAsistencia() || this.hoy());
    this.fechaAsistencia.set(f);
    this.cargandoAsistencia.set(true);
    this.asistenciaModificada.set(false);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<SesionAsistencia>(
      `http://localhost:8080/api/portal/docente/cursos/${idAulaCurso}/asistencia?fecha=${f}`,
      { headers }
    ).subscribe({
      next: data => {
        this.sesionAsistencia.set(data);
        this.asistenciaLocal.set(data.alumnos.map(a => ({ ...a })));
        this.cargandoAsistencia.set(false);
      },
      error: () => this.cargandoAsistencia.set(false),
    });
  }

  cargarFechasSesiones(idAulaCurso: number) {
    const token = this.auth.getToken();
    if (!token) return;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<string[]>(
      `http://localhost:8080/api/portal/docente/cursos/${idAulaCurso}/asistencia/fechas`,
      { headers }
    ).subscribe({ next: data => this.fechasSesiones.set(data) });
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
    const token = this.auth.getToken();
    if (!token) return;
    this.guardandoAsistencia.set(true);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
    const body = {
      fecha:   this.fechaAsistencia(),
      alumnos: this.asistenciaLocal().map(a => ({
        idAlumno:     a.idAlumno,
        estado:       a.estado,
        justificante: a.justificante || null,
      })),
    };
    this.http.post<SesionAsistencia>(
      `http://localhost:8080/api/portal/docente/cursos/${curso.idAulaCurso}/asistencia`,
      body, { headers }
    ).subscribe({
      next: data => {
        this.sesionAsistencia.set(data);
        this.asistenciaLocal.set(data.alumnos.map(a => ({ ...a })));
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

  cargarPendientes() {
    const token = this.auth.getToken();
    if (!token) return;
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<Pendiente[]>(
      'http://localhost:8080/api/portal/docente/pendientes',
      { headers }
    ).subscribe({ next: data => this.pendientes.set(data) });
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
