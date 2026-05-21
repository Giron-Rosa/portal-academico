import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

export interface Curso {
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
  tipo: string;          // 'justificante' | 'consulta' | 'otro'
  leido: boolean;
  fechaEnvio: string;    // "DD/MM/YYYY HH:MM"
  nombrePadre: string;
  nombreAlumno: string | null;
  grado: string | null;
  seccion: string | null;
  curso: string | null;
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
  grado: string;
  curso: string;
  titulo: string;
  tema: string;
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
  /** Filtro de grado activo en la bandeja ('' = Todos) */
  filtroGradoMsg     = signal('');
  /** Texto que el docente está escribiendo como respuesta */
  replyText          = signal('');
  enviandoReply      = signal(false);

  /** Grados únicos presentes en los mensajes, para los filtro-tabs */
  gradosMensajes = computed(() => {
    const grados = this.mensajes()
      .map(m => m.grado)
      .filter((g): g is string => !!g);
    return [...new Set(grados)];
  });

  /** Lista de mensajes filtrada por grado seleccionado */
  mensajesFiltrados = computed(() => {
    const filtro = this.filtroGradoMsg();
    if (!filtro) return this.mensajes();
    return this.mensajes().filter(m => m.grado === filtro);
  });

  /** Cantidad de mensajes no leídos (para el badge del sidebar) */
  noLeidos = computed(() => this.mensajes().filter(m => !m.leido).length);

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
        },
      });
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
