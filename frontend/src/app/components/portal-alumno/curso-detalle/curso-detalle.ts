import {
  Component, Input, Output, EventEmitter,
  inject, signal, computed, OnInit
} from '@angular/core';
import { CommonModule, DecimalPipe, DatePipe, PercentPipe } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';
import type { Curso } from '../portal-alumno';

// ──────────────────────────────────────────────────────────────────────
// Tipos que llegan del backend
// ──────────────────────────────────────────────────────────────────────

export interface AsistenciaRegistro {
  fecha: string;       // 'YYYY-MM-DD'
  estado: string;      // presente | falta | tardanza | justificado
  justificante: string | null;
}

export interface AsistenciaCurso {
  historial:           AsistenciaRegistro[];
  totalClases:         number;
  presente:            number;
  tardanza:            number;
  falta:               number;
  justificado:         number;
  porcentajeAsistencia: number;
}

export interface MaterialAlumno {
  idMaterial:    number;
  semana:        number;
  clase:         number;
  titulo:        string;
  tipo:          string;   // pdf | word | url | video | youtube
  url:           string | null;
  fechaCreacion: string;
}

export interface TareaAlumno {
  idTarea:        number;
  numeroTarea:    number;
  semana:         number;
  clase:          number;
  titulo:         string;
  descripcion:    string | null;
  tipoEntregable: string | null;
  fechaEntrega:   string | null;
  notaMaxima:     number;
  nota:           number | null;
  entregado:      boolean;
}

export interface ActividadAlumno {
  idExamen:        number;
  numeroExamen:    number;
  semana:          number;
  titulo:          string;
  descripcion:     string | null;
  tipo:            string;  // escrito | oral | online | practico
  fechaExamen:     string | null;
  duracionMinutos: number | null;
  notaMaxima:      number;
  nota:            number | null;
  asistio:         boolean;
}

export interface ReporteAlumno {
  idReporte:   number;
  tipo:        string;   // anotacion | felicitacion | llamada_atencion | otro
  titulo:      string;
  descripcion: string | null;
  fecha:       string;
}

export interface Unidad {
  idUnidad: number;
  idAulaCurso: number;
  numero: number;
  titulo: string;
  bimestre: string;
  semanas: string;
  objetivos: string[];
  indicadores: string[];
  contenidos: string[];
  estado: 'pendiente' | 'en_curso' | 'concluido';
  fechaConclusion?: string;
}

// Tipos de tabs
type Tab = 'temario' | 'asistencia' | 'contenido' | 'tareas' | 'actividades' | 'reportes';

// Nodo del árbol de contenido
interface ClaseNodo { clase: number; items: MaterialAlumno[]; }
interface SemanaNodo { semana: number; clases: ClaseNodo[]; }

// ──────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-curso-detalle',
  standalone: true,
  imports: [CommonModule, DecimalPipe],
  templateUrl: './curso-detalle.html',
  styleUrl: './curso-detalle.scss',
})
export class CursoDetalle implements OnInit {
  @Input({ required: true }) curso!: Curso;
  @Output() volver = new EventEmitter<void>();

  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private readonly BASE = 'http://localhost:8080/api/portal/alumno/cursos';

  // ── Estado de UI ──────────────────────────────────────────────────
  tabActiva = signal<Tab>('temario');
  cargando  = signal(true);
  error     = signal('');

  tabs: { id: Tab; label: string; icono: string }[] = [
    { id: 'temario',     label: 'Temario',      icono: 'book-open'     },
    { id: 'asistencia',  label: 'Asistencia',   icono: 'check-circle'  },
    { id: 'contenido',   label: 'Contenido',    icono: 'folder'        },
    { id: 'tareas',      label: 'Tareas',       icono: 'clipboard'     },
    { id: 'actividades', label: 'Actividades',  icono: 'zap'           },
    { id: 'reportes',    label: 'Reportes',     icono: 'file-text'     },
  ];

  // ── Datos por tab ─────────────────────────────────────────────────
  asistencia   = signal<AsistenciaCurso | null>(null);
  materiales   = signal<MaterialAlumno[]>([]);
  tareas       = signal<TareaAlumno[]>([]);
  actividades  = signal<ActividadAlumno[]>([]);
  reportes     = signal<ReporteAlumno[]>([]);

  // ── Temario signals ───────────────────────────────────────────────
  unidades = signal<Unidad[]>([]);
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

  /** Árbol semana → clase → materiales */
  contenidoArbol = computed<SemanaNodo[]>(() => {
    const mats = this.materiales();
    const map = new Map<number, Map<number, MaterialAlumno[]>>();
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

  /** Semanas/Clases expandidas en el acordeón de contenido */
  semanasAbiertas = signal<Set<number>>(new Set([1]));
  clasesAbiertas  = signal<Set<string>>(new Set(['1-1']));

  // ── Estadísticas rápidas para tareas ─────────────────────────────
  tareasEntregadas = computed(() =>
    this.tareas().filter(t => t.entregado).length
  );
  tareasConNota = computed(() =>
    this.tareas().filter(t => t.nota !== null).length
  );
  promedioTareas = computed(() => {
    const conNota = this.tareas().filter(t => t.nota !== null);
    if (!conNota.length) return null;
    const suma = conNota.reduce((s, t) => s + t.nota!, 0);
    return Math.round((suma / conNota.length) * 10) / 10;
  });

  // ── Estadísticas rápidas para actividades ────────────────────────
  promedioActividades = computed(() => {
    const conNota = this.actividades().filter(a => a.nota !== null);
    if (!conNota.length) return null;
    const suma = conNota.reduce((s, a) => s + a.nota!, 0);
    return Math.round((suma / conNota.length) * 10) / 10;
  });

  ngOnInit() {
    this.cargarTab('temario');
  }

  setTab(tab: Tab) {
    this.tabActiva.set(tab);
    this.error.set('');
    if (tab === 'temario'     && !this.unidades().length)    this.cargarTab(tab);
    if (tab === 'asistencia'  && !this.asistencia())         this.cargarTab(tab);
    if (tab === 'contenido'   && !this.materiales().length)  this.cargarTab(tab);
    if (tab === 'tareas'      && !this.tareas().length)      this.cargarTab(tab);
    if (tab === 'actividades' && !this.actividades().length) this.cargarTab(tab);
    if (tab === 'reportes'    && !this.reportes().length)    this.cargarTab(tab);
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${this.auth.getToken()}` });
  }

  private cargarTab(tab: Tab) {
    this.cargando.set(true);
    const id = this.curso.idAulaCurso;
    const h  = this.headers();

    const urls: Record<Tab, string> = {
      temario:     `http://localhost:8080/api/portal/alumno/cursos/${id}/temario`,
      asistencia:  `${this.BASE}/${id}/asistencia`,
      contenido:   `${this.BASE}/${id}/contenido`,
      tareas:      `${this.BASE}/${id}/tareas`,
      actividades: `${this.BASE}/${id}/actividades`,
      reportes:    `${this.BASE}/${id}/reportes`,
    };

    this.http.get<any>(urls[tab], { headers: h }).subscribe({
      next: (data) => {
        if (tab === 'temario')     this.unidades.set(data as Unidad[]);
        if (tab === 'asistencia')  this.asistencia.set(data as AsistenciaCurso);
        if (tab === 'contenido')   this.materiales.set(data as MaterialAlumno[]);
        if (tab === 'tareas')      this.tareas.set(data as TareaAlumno[]);
        if (tab === 'actividades') this.actividades.set(data as ActividadAlumno[]);
        if (tab === 'reportes')    this.reportes.set(data as ReporteAlumno[]);
        this.cargando.set(false);
      },
      error: () => {
        this.error.set('No se pudo cargar la información. Intenta de nuevo.');
        this.cargando.set(false);
      },
    });
  }

  // ── Helpers de UI ─────────────────────────────────────────────────

  toggleUnidad(numero: number) {
    this.unidadesAbiertas.update(s => {
      const n = new Set(s);
      n.has(numero) ? n.delete(numero) : n.add(numero);
      return n;
    });
  }

  toggleSemana(semana: number) {
    this.semanasAbiertas.update(s => {
      const n = new Set(s);
      n.has(semana) ? n.delete(semana) : n.add(semana);
      return n;
    });
  }

  toggleClase(semana: number, clase: number) {
    const key = `${semana}-${clase}`;
    this.clasesAbiertas.update(s => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }

  isSemanaAbierta(semana: number)       { return this.semanasAbiertas().has(semana); }
  isClaseAbierta(semana: number, clase: number) {
    return this.clasesAbiertas().has(`${semana}-${clase}`);
  }

  estadoLabel(estado: string): string {
    return { presente: 'Presente', falta: 'Falta', tardanza: 'Tardanza', justificado: 'Justificado' }[estado] ?? estado;
  }

  estadoClass(estado: string): string {
    return { presente: 'verde', falta: 'rojo', tardanza: 'ambar', justificado: 'azul' }[estado] ?? '';
  }

  tipoIcon(tipo: string): string {
    const icons: Record<string, string> = {
      pdf: '📄', word: '📝', url: '🔗', video: '🎬', youtube: '▶️',
    };
    return icons[tipo] ?? '📎';
  }

  tipoActividadLabel(tipo: string): string {
    return { escrito: 'Escrito', oral: 'Oral', online: 'Online', practico: 'Práctico' }[tipo] ?? tipo;
  }

  tipoReporteIcon(tipo: string): string {
    return { felicitacion: '🏆', anotacion: '📋', llamada_atencion: '⚠️', otro: '📌' }[tipo] ?? '📌';
  }

  tipoReporteClass(tipo: string): string {
    return { felicitacion: 'verde', anotacion: 'azul', llamada_atencion: 'ambar', otro: 'gris' }[tipo] ?? 'gris';
  }

  notaColor(nota: number | null, max: number): string {
    if (nota === null) return '';
    const pct = nota / max;
    if (pct >= 0.55) return 'verde';
    if (pct >= 0.30) return 'ambar';
    return 'rojo';
  }

  /** Porcentaje de la barra circular de asistencia (stroke-dashoffset) */
  asistenciaOffset(pct: number): number {
    const circumference = 2 * Math.PI * 44;   // radio = 44
    return circumference - (pct / 100) * circumference;
  }
}
