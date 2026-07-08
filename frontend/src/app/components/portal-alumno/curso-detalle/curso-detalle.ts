import {
  Component, Input, Output, EventEmitter,
  inject, signal, computed, OnInit
} from '@angular/core';
import { Observable } from 'rxjs';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { AuthService } from '../../../services/auth.service';
import { AlumnoService } from '../../../services/alumno.service';
import type { CursoAlumno as Curso } from '../../../shared/models/alumno.models';
import type {
  MaterialAlumno, TareaAlumno, ActividadAlumno,
  AsistenciaRegistroCurso as AsistenciaRegistro, AsistenciaCurso,
  ReporteAlumno, UnidadAlumno as Unidad
} from '../../../shared/models/alumno.models';

// ──────────────────────────────────────────────────────────────────────
// Tipos internos
// ──────────────────────────────────────────────────────────────────────

// Tipos de tabs
type Tab = 'temario' | 'asistencia' | 'contenido' | 'tareas' | 'actividades' | 'reportes';

// Nodo del árbol de contenido
interface ClaseNodo { clase: number; items: MaterialAlumno[]; }
interface SemanaNodo { semana: number; clases: ClaseNodo[]; }

// ──────────────────────────────────────────────────────────────────────

@Component({
  selector: 'app-curso-detalle',
  standalone: true,
  imports: [CommonModule, DecimalPipe, FormsModule],
  templateUrl: './curso-detalle.html',
  styleUrl: './curso-detalle.scss',
})
export class CursoDetalle implements OnInit {
  @Input({ required: true }) curso!: Curso;
  @Output() volver = new EventEmitter<void>();

  private alumnoService = inject(AlumnoService);
  private auth = inject(AuthService);
  private sanitizer = inject(DomSanitizer);

  // ── Previsualización de Materiales ─────────────────────────────────
  materialSeleccionadoParaVer = signal<MaterialAlumno | null>(null);
  safeUrl = computed(() => {
    const mat = this.materialSeleccionadoParaVer();
    if (!mat || !mat.url) return null;
    let url = mat.url;
    if (mat.tipo === 'youtube' && url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      if (videoId) {
        url = `https://www.youtube.com/embed/${videoId}`;
      }
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

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



  private cargarTab(tab: Tab) {
    this.cargando.set(true);
    const id = this.curso.idAulaCurso;

    let obs: Observable<any>;
    switch (tab) {
      case 'temario':
        obs = this.alumnoService.getTemario(id);
        break;
      case 'asistencia':
        obs = this.alumnoService.getAsistenciaCurso(id);
        break;
      case 'contenido':
        obs = this.alumnoService.getMateriales(id);
        break;
      case 'tareas':
        obs = this.alumnoService.getTareas(id);
        break;
      case 'actividades':
        obs = this.alumnoService.getActividades(id);
        break;
      case 'reportes':
        obs = this.alumnoService.getReportes(id);
        break;
      default:
        this.cargando.set(false);
        return;
    }

    obs.subscribe({
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

  abrirMaterial(mat: MaterialAlumno) {
    this.materialSeleccionadoParaVer.set(mat);
  }

  cerrarMaterial() {
    this.materialSeleccionadoParaVer.set(null);
  }

  // ── Chat de IA ────────────────────────────────────────────────────
  /** Material seleccionado para chatear con la IA */
  materialIaSeleccionado = signal<MaterialAlumno | null>(null);
  chatMensajes = signal<{ rol: 'usuario' | 'ia'; texto: string }[]>([]);
  chatInput = '';
  chatCargando = signal(false);

  abrirChatIa(mat: MaterialAlumno) {
    this.materialIaSeleccionado.set(mat);
    this.chatMensajes.set([
      { rol: 'ia', texto: `¡Hola! 👋 Soy tu Asistente IA para el material **"${mat.titulo}"**. Puedo ayudarte a: hacer un resumen de la clase, crear un quiz de repaso, o responder tus dudas sobre este tema. ¿Qué necesitas?` }
    ]);
  }

  cerrarChatIa() {
    this.materialIaSeleccionado.set(null);
    this.chatMensajes.set([]);
    this.chatInput = '';
  }

  enviarMensajeIa() {
    const texto = this.chatInput.trim();
    const mat = this.materialIaSeleccionado();
    if (!texto || !mat || this.chatCargando()) return;

    this.chatMensajes.update(msgs => [...msgs, { rol: 'usuario', texto }]);
    this.chatInput = '';
    this.chatCargando.set(true);

    this.alumnoService.enviarMensajeIaChat(
      { idMaterial: String(mat.idMaterial), mensaje: texto }
    ).subscribe({
      next: (res) => {
        this.chatMensajes.update(msgs => [...msgs, { rol: 'ia', texto: res.respuesta }]);
        this.chatCargando.set(false);
      },
      error: () => {
        this.chatMensajes.update(msgs => [...msgs, { rol: 'ia', texto: '❌ Error al conectar con el asistente. Intenta de nuevo.' }]);
        this.chatCargando.set(false);
      }
    });
  }

  onChatKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.enviarMensajeIa();
    }
  }
}
