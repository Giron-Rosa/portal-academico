import { Component, inject, signal, OnInit, OnDestroy, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';
import { AlumnoService } from '../../services/alumno.service';
import { CursoDetalle } from './curso-detalle/curso-detalle';
import { AluInicio } from './sections/alu-inicio/alu-inicio';
import { AluCalificaciones } from './sections/alu-calificaciones/alu-calificaciones';
import { AluAsistencia } from './sections/alu-asistencia/alu-asistencia';
import { AluCalendario } from './sections/alu-calendario/alu-calendario';
import { AluTareas } from './sections/alu-tareas/alu-tareas';
import { AluRefuerzo } from './sections/alu-refuerzo/alu-refuerzo';
import { AluRecursos } from './sections/alu-recursos/alu-recursos';

import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import type {
  CursoAlumno, CursoAlumnoApi, CalificacionGlobal, AsistenciaGlobal,
  ActividadDashboard, TareaAlumno, TareaAlumnoExt, ActividadAlumno,
  ActividadAlumnoExt, MaterialAlumno, MaterialAlumnoExt, SeccionAlumno
} from '../../shared/models/alumno.models';

type Seccion = SeccionAlumno;
export type Curso = CursoAlumno;
type CursoApi = CursoAlumnoApi;
type Actividad = ActividadDashboard;


@Component({
  selector: 'app-portal-alumno',
  imports: [CommonModule, CursoDetalle, AluInicio, AluCalificaciones, AluAsistencia, AluCalendario, AluTareas, AluRefuerzo, AluRecursos],
  templateUrl: './portal-alumno.html',
  styleUrl: './portal-alumno.scss',
})
export class PortalAlumno implements OnInit, OnDestroy {
  private router = inject(Router);
  private auth = inject(AuthService);
  private alumnoService = inject(AlumnoService);
  readonly ws = inject(WebSocketService);

  seccionActiva = signal<Seccion>('inicio');
  dropdownOpen = signal(false);
  periodo = signal('');
  cargando = signal(true);
  errorCarga = signal('');
  cursos = signal<Curso[]>([]);

  // ── Global metrics signals ──
  calificacionesGlobales = signal<CalificacionGlobal[]>([]);
  asistenciasGlobales = signal<AsistenciaGlobal[]>([]);
  cargandoCalificaciones = signal(false);
  cargandoAsistencias = signal(false);

  // Calificaciones KPIs
  promedioGeneral = computed(() => {
    const cg = this.calificacionesGlobales();
    if (cg.length === 0) return 0;
    let sum = 0;
    let count = 0;
    cg.forEach(c => {
      const grades = [c.bim1, c.bim2, c.bim3, c.bim4].filter(g => g !== null) as number[];
      if (grades.length > 0) {
        sum += grades.reduce((acc, val) => acc + val, 0) / grades.length;
        count++;
      }
    });
    return count === 0 ? 0 : Math.round((sum / count) * 10) / 10;
  });

  cursosAprobados = computed(() => {
    const cg = this.calificacionesGlobales();
    return cg.filter(c => {
      const grades = [c.bim1, c.bim2, c.bim3, c.bim4].filter(g => g !== null) as number[];
      if (grades.length === 0) return false;
      const avg = grades.reduce((acc, val) => acc + val, 0) / grades.length;
      return avg >= 11;
    }).length;
  });

  cursosPorRecuperar = computed(() => {
    const cg = this.calificacionesGlobales();
    return cg.filter(c => {
      const grades = [c.bim1, c.bim2, c.bim3, c.bim4].filter(g => g !== null) as number[];
      if (grades.length === 0) return false;
      const avg = grades.reduce((acc, val) => acc + val, 0) / grades.length;
      return avg < 11;
    }).length;
  });

  // Asistencias KPIs
  totalClasesAsistencia = computed(() => {
    return this.asistenciasGlobales().reduce((acc, c) => acc + c.total, 0);
  });
  totalPresenteAsistencia = computed(() => {
    return this.asistenciasGlobales().reduce((acc, c) => acc + c.presente, 0);
  });
  totalTardanzaAsistencia = computed(() => {
    return this.asistenciasGlobales().reduce((acc, c) => acc + c.tardanza, 0);
  });
  totalFaltaAsistencia = computed(() => {
    return this.asistenciasGlobales().reduce((acc, c) => acc + c.falta, 0);
  });
  totalJustificadoAsistencia = computed(() => {
    return this.asistenciasGlobales().reduce((acc, c) => acc + c.justificado, 0);
  });
  porcentajeGlobalAsistencia = computed(() => {
    const total = this.totalClasesAsistencia();
    if (total === 0) return 100.0;
    const pres = this.totalPresenteAsistencia();
    const tard = this.totalTardanzaAsistencia();
    const just = this.totalJustificadoAsistencia();
    return Math.round((pres + tard + just) * 1000 / total) / 10;
  });

  // Calendario Subsección
  subSeccionCalendario = signal<'mensual' | 'horario'>('mensual');

  // Horario Semanal Dinámico (cargado de la base de datos)
  horarioSemanal: any[] = [
    { hora: '07:30 - 09:00', lunes: '', martes: '', miercoles: '', jueves: '', viernes: '' },
    { hora: '09:00 - 10:30', lunes: '', martes: '', miercoles: '', jueves: '', viernes: '' },
    { hora: '10:30 - 11:00', lunes: 'Recreo', martes: 'Recreo', miercoles: 'Recreo', jueves: 'Recreo', viernes: 'Recreo' },
    { hora: '11:00 - 12:30', lunes: '', martes: '', miercoles: '', jueves: '', viernes: '' },
    { hora: '12:30 - 14:00', lunes: '', martes: '', miercoles: '', jueves: '', viernes: '' }
  ];

  /** Curso activo para la vista de detalle (null = mostrar grid) */
  cursoActivo = signal<Curso | null>(null);

  nombre = this.auth.getNombre() ?? 'Estudiante';
  codigo = this.auth.getCodigo() ?? '';
  iniciales = this.nombre.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();

  navItems: { id: Seccion; label: string; icon: string }[] = [
    { id: 'inicio', label: 'Inicio', icon: 'home' },
    { id: 'calificaciones', label: 'Calificaciones', icon: 'award' },
    { id: 'asistencias', label: 'Asistencia Global', icon: 'check-circle' },
    { id: 'calendario', label: 'Calendario', icon: 'calendar' },
    { id: 'kanban', label: 'Tablero Kanban', icon: 'kanban' },
    { id: 'refuerzo', label: 'Refuerzo', icon: 'refuerzo' },
    { id: 'recursos', label: 'Recursos', icon: 'recursos' },
  ];

  // Actividades calculadas dinámicamente desde tareas y exámenes de la BD
  actividades = computed<Actividad[]>(() => {
    const ts = this.tareasTotal();
    const as = this.actividadesTotal();
    const list: Actividad[] = [];

    // Mapear tareas
    ts.forEach(t => {
      let estado: 'pendiente' | 'vencido' | 'entregado' = 'pendiente';
      if (t.entregado) {
        estado = 'entregado';
      } else if (t.fechaEntrega) {
        const dueDate = new Date(t.fechaEntrega + 'T23:59:59');
        if (dueDate < new Date()) {
          estado = 'vencido';
        }
      }
      list.push({
        tipo: 'Tarea',
        titulo: t.titulo,
        curso: t.cursoNombre,
        vence: t.fechaEntrega ? this.formatDateReadable(t.fechaEntrega) : 'Sin fecha',
        estado
      });
    });

    // Mapear exámenes/actividades
    as.forEach(a => {
      let estado: 'pendiente' | 'vencido' | 'entregado' = 'pendiente';
      if (a.nota !== null || a.asistio) {
        estado = 'entregado';
      } else if (a.fechaExamen) {
        const dueDate = new Date(a.fechaExamen + 'T23:59:59');
        if (dueDate < new Date()) {
          estado = 'vencido';
        }
      }

      let tipoText = 'Evaluación';
      if (a.tipo === 'escrito') tipoText = 'Examen Escrito';
      else if (a.tipo === 'oral') tipoText = 'Evaluación Oral';
      else if (a.tipo === 'online') tipoText = 'Examen Online';
      else if (a.tipo === 'practico') tipoText = 'Práctica';

      list.push({
        tipo: tipoText,
        titulo: a.titulo,
        curso: a.cursoNombre,
        vence: a.fechaExamen ? this.formatDateReadable(a.fechaExamen) : 'Sin fecha',
        estado
      });
    });

    return list.sort((a, b) => {
      if (a.estado === 'pendiente' && b.estado !== 'pendiente') return -1;
      if (a.estado !== 'pendiente' && b.estado === 'pendiente') return 1;
      return 0;
    }).slice(0, 8);
  });

  private readonly COLORES: Record<string, string> = {
    'Matemática': '#dce8f7',
    'Comunicación': '#fde8e8',
    'Ciencia y Tecnología': '#e8f7ec',
    'Historia, Geografía y Economía': '#f0e8f7',
    'Inglés': '#fef9e0',
    'Arte y Cultura': '#fde0ec',
    'Educación Física': '#e0f7ec',
    'Personal Social': '#e8f0fe',
    'Religión': '#f7f0e8',
  };

  private readonly AREA_KEY: Record<string, string> = {
    'Matemática': 'mat',
    'Comunicación': 'com',
    'Ciencias': 'cie',
    'Sociales': 'his',
    'Idiomas': 'ing',
    'Arte': 'art',
    'Educación Física': 'efi',
    'Formación': 'rel',
  };

  // ── Datos Consolidados para Vistas Globales ────────────────────────
  tareasTotal = signal<TareaAlumnoExt[]>([]);
  actividadesTotal = signal<ActividadAlumnoExt[]>([]);
  materialesTotal = signal<MaterialAlumnoExt[]>([]);

  // ── Calendario Signal State ────────────────────────
  fechaCalendario = signal<Date>(new Date());
  anoActual = computed(() => this.fechaCalendario().getFullYear());
  mesActual = computed(() => this.fechaCalendario().getMonth());
  nombreMesActual = computed(() => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return meses[this.mesActual()];
  });

  diasCalendario = computed(() => {
    const año = this.anoActual();
    const mes = this.mesActual();

    const primerDia = new Date(año, mes, 1);
    // Convertir a base lunes (0=Lunes, 6=Domingo)
    let primerDiaSemana = primerDia.getDay() - 1;
    if (primerDiaSemana === -1) primerDiaSemana = 6;

    const ultimoDia = new Date(año, mes + 1, 0).getDate();
    const ultimoDiaMesAnterior = new Date(año, mes, 0).getDate();

    const dias = [];
    const hoy = new Date();

    // Días del mes anterior
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
      const d = ultimoDiaMesAnterior - i;
      const fecha = new Date(año, mes - 1, d);
      dias.push({
        diaNumero: d,
        fecha,
        fechaStr: this.formatDate(fecha),
        esHoy: false,
        mesDiferente: true,
        eventos: [] as any[]
      });
    }

    // Días del mes actual
    for (let d = 1; d <= ultimoDia; d++) {
      const fecha = new Date(año, mes, d);
      dias.push({
        diaNumero: d,
        fecha,
        fechaStr: this.formatDate(fecha),
        esHoy: this.isSameDay(fecha, hoy),
        mesDiferente: false,
        eventos: [] as any[]
      });
    }

    // Completar el grid de 35 o 42 celdas
    const totalCeldas = dias.length > 35 ? 42 : 35;
    const diasSiguientes = totalCeldas - dias.length;
    for (let d = 1; d <= diasSiguientes; d++) {
      const fecha = new Date(año, mes + 1, d);
      dias.push({
        diaNumero: d,
        fecha,
        fechaStr: this.formatDate(fecha),
        esHoy: false,
        mesDiferente: true,
        eventos: [] as any[]
      });
    }

    // Unir con tareas, exámenes y horario
    const tareas = this.tareasTotal();
    const actividades = this.actividadesTotal();
    const mapDiaSemana: Record<number, string> = {
      1: 'lunes',
      2: 'martes',
      3: 'miercoles',
      4: 'jueves',
      5: 'viernes'
    };

    dias.forEach(dia => {
      // Add scheduled courses for the weekday (Mon-Fri)
      const dayOfWeek = dia.fecha.getDay();
      const weekdayKey = mapDiaSemana[dayOfWeek];
      if (weekdayKey) {
        this.horarioSemanal.forEach(row => {
          const subject = (row as any)[weekdayKey];
          if (subject && subject !== 'Recreo' && subject !== 'Tutoría') {
            dia.eventos.push({
              titulo: `${row.hora}: ${subject}`,
              tipo: 'clase',
              curso: subject
            });
          }
        });
      }

      tareas.forEach(t => {
        if (t.fechaEntrega === dia.fechaStr) {
          dia.eventos.push({
            titulo: t.titulo,
            tipo: 'tarea',
            curso: t.cursoNombre
          });
        }
      });
      actividades.forEach(a => {
        if (a.fechaExamen === dia.fechaStr) {
          dia.eventos.push({
            titulo: a.titulo,
            tipo: 'actividad',
            curso: a.cursoNombre
          });
        }
      });
    });

    return dias;
  });

  // ── Kanban Computados ────────────────────────
  tareasPendientes = computed(() => this.tareasTotal().filter(t => !t.entregado));
  tareasEntregadas = computed(() => this.tareasTotal().filter(t => t.entregado && t.nota === null));
  tareasCalificadas = computed(() => this.tareasTotal().filter(t => t.entregado && t.nota !== null));

  /** IDs de tareas cuya entrega está en proceso (para feedback visual) */
  kanbanEntregando = signal<Set<number>>(new Set());

  // Drag & Drop State
  draggedTarea: TareaAlumnoExt | null = null;
  activeDragOverCol = signal<string | null>(null);

  /** Marca una tarea pendiente como entregada llamando al endpoint del alumno */
  marcarComoEntregada(tarea: TareaAlumnoExt) {
    // Marcar como procesando
    this.kanbanEntregando.update(s => { const n = new Set(s); n.add(tarea.idTarea); return n; });
    this.alumnoService.entregarTarea(tarea.idAulaCurso, tarea.idTarea).subscribe({
      next: () => {
        // Actualizar la tarea localmente (optimistic update)
        this.tareasTotal.update(list =>
          list.map(t => t.idTarea === tarea.idTarea ? { ...t, entregado: true } : t)
        );
        this.kanbanEntregando.update(s => { const n = new Set(s); n.delete(tarea.idTarea); return n; });
      },
      error: () => {
        this.kanbanEntregando.update(s => { const n = new Set(s); n.delete(tarea.idTarea); return n; });
        alert('No se pudo marcar como entregada. Por favor inténtalo de nuevo.');
      }
    });
  }

  // ── Refuerzo Computados (RN-10.2: promedio_curso < 11) ────────────────────────
  cursosConRiesgo = computed(() => {
    const cursosList = this.cursos();
    const tareas = this.tareasTotal();
    const actividades = this.actividadesTotal();

    const enRiesgo: (Curso & { promedio: number })[] = [];

    cursosList.forEach(c => {
      const notas: number[] = [];
      tareas.filter(t => t.idAulaCurso === c.idAulaCurso && t.nota !== null).forEach(t => notas.push(t.nota!));
      actividades.filter(a => a.idAulaCurso === c.idAulaCurso && a.nota !== null).forEach(a => notas.push(a.nota!));

      if (notas.length > 0) {
        const sum = notas.reduce((acc, v) => acc + v, 0);
        const prom = Math.round((sum / notas.length) * 10) / 10;
        if (prom < 11.0) {
          enRiesgo.push({ ...c, promedio: prom });
        }
      }
    });

    return enRiesgo;
  });

  tieneCursosEnRiesgo = computed(() => this.cursosConRiesgo().length > 0);

  // Refuerzo Académico: Selección de Semana y Filtros
  semanaRefuerzoSeleccionada = signal<number>(1);
  semanasLista = [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16];

  materialesRefuerzoFiltrados = computed(() => {
    const sem = this.semanaRefuerzoSeleccionada();
    const mats = this.materialesTotal();
    return mats.filter(m => m.semana === sem);
  });

  videosExplicativos = computed(() => {
    return this.materialesRefuerzoFiltrados().filter(m => 
      m.tipo === 'youtube' || m.tipo === 'video' || m.titulo.toLowerCase().includes('video') || m.titulo.toLowerCase().includes('tutorial')
    );
  });

  librosReferencia = computed(() => {
    return this.materialesRefuerzoFiltrados().filter(m => 
      m.titulo.toLowerCase().includes('libro') || m.titulo.toLowerCase().includes('guía') || m.titulo.toLowerCase().includes('lectura') || m.titulo.toLowerCase().includes('referencia')
    );
  });

  fichasPractica = computed(() => {
    const vids = this.videosExplicativos();
    const libs = this.librosReferencia();
    return this.materialesRefuerzoFiltrados().filter(m => 
      !vids.includes(m) && !libs.includes(m)
    );
  });
  // Recursos Biblioteca Digital
  busquedaRecurso = signal('');
  categoriaRecursoActiva = signal<string>('Biblioteca Digital');

  categoriasRecursos = [
    { id: 'Biblioteca Digital', icon: '📖', color: '#eff6ff', border: '#bfdbfe' },
    { id: 'Herramientas', icon: '🛠️', color: '#ecfdf5', border: '#a7f3d0' },
    { id: 'Enlaces Útiles', icon: '🔗', color: '#fffbeb', border: '#fde68a' },
    { id: 'Plantillas', icon: '📄', color: '#fdf2f8', border: '#fbcfe8' },
    { id: 'Institucional', icon: '🏢', color: '#faf5ff', border: '#e9d5ff' },
    { id: 'Apoyo Académico', icon: '🎓', color: '#f0fdf4', border: '#bbf7d0' },
    { id: 'Multimedia', icon: '🎬', color: '#fff1f2', border: '#fecdd3' },
    { id: 'Comunidad', icon: '👥', color: '#f8fafc', border: '#e2e8f0' },
  ];

  listadoRecursos: any[] = [];

  recursosFiltrados = computed(() => {
    const q = this.busquedaRecurso().toLowerCase().trim();
    const cat = this.categoriaRecursoActiva();
    
    if (q === '') {
      return this.listadoRecursos.filter(r => r.cat === cat);
    } else {
      return this.listadoRecursos.filter(r => 
        r.nombre.toLowerCase().includes(q) || 
        r.desc.toLowerCase().includes(q) || 
        r.cat.toLowerCase().includes(q)
      );
    }
  });

  // Método para actualizar la búsqueda
  actualizarBusqueda(e: Event) {
    const input = e.target as HTMLInputElement;
    this.busquedaRecurso.set(input.value);
  }
  ngOnInit() {
    const token = this.auth.getToken();
    if (!token) { this.router.navigate(['/']); return; }

    this.ws.connect();

    this.alumnoService.getCursos().subscribe({
      next: (data) => {
        if (data.length > 0) this.periodo.set(data[0].periodo);
        const mappedCursos = data.map(d => ({
          idAulaCurso: d.idAulaCurso,
          nombre: d.nombre,
          grado: d.grado,
          seccion: d.seccion,
          turno: d.turno,
          horasSemana: d.horasSemana,
          docente: d.docente,
          color: this.COLORES[d.nombre] ?? '#e8f0fb',
          areaKey: this.AREA_KEY[d.area] ?? 'gen',
        }));
        this.cursos.set(mappedCursos);
        this.cargando.set(false);

        // Cargar los datos adicionales una vez tenemos los cursos
        this.cargarDatosConsolidados(mappedCursos);
        this.cargarRecursos();
      },
      error: () => {
        this.errorCarga.set('No se pudieron cargar los cursos. Intenta de nuevo.');
        this.cargando.set(false);
      },
    });
  }

  private cargarDatosConsolidados(cursos: Curso[]) {
    if (cursos.length === 0) return;

    // Tareas
    const tareasReqs = cursos.map(c =>
      this.alumnoService.getTareas(c.idAulaCurso)
        .pipe(
          map(ts => ts.map(t => ({ ...t, idAulaCurso: c.idAulaCurso, cursoNombre: c.nombre } as TareaAlumnoExt))),
          catchError(() => of([] as TareaAlumnoExt[]))
        )
    );

    forkJoin(tareasReqs).subscribe({
      next: (res) => {
        const flat = res.reduce((acc, val) => acc.concat(val), []);
        this.tareasTotal.set(flat);
      }
    });

    // Actividades/Exámenes
    const actividadesReqs = cursos.map(c =>
      this.alumnoService.getActividades(c.idAulaCurso)
        .pipe(
          map(as => as.map(a => ({ ...a, idAulaCurso: c.idAulaCurso, cursoNombre: c.nombre } as ActividadAlumnoExt))),
          catchError(() => of([] as ActividadAlumnoExt[]))
        )
    );

    forkJoin(actividadesReqs).subscribe({
      next: (res) => {
        const flat = res.reduce((acc, val) => acc.concat(val), []);
        this.actividadesTotal.set(flat);
      }
    });

    // Materiales
    const materialesReqs = cursos.map(c =>
      this.alumnoService.getMateriales(c.idAulaCurso)
        .pipe(
          map(ms => ms.map(m => ({ ...m, idAulaCurso: c.idAulaCurso, cursoNombre: c.nombre } as MaterialAlumnoExt))),
          catchError(() => of([] as MaterialAlumnoExt[]))
        )
    );

    forkJoin(materialesReqs).subscribe({
      next: (res) => {
        const flat = res.reduce((acc, val) => acc.concat(val), []);
        this.materialesTotal.set(flat);
      }
    });

    this.cargarHorarioSemanal();
  }

  setSeccion(id: Seccion) {
    this.seccionActiva.set(id);
    this.cursoActivo.set(null);   // cerrar cualquier detalle abierto
    this.dropdownOpen.set(false);

    if (id === 'calificaciones') {
      this.cargarCalificacionesGlobales();
    } else if (id === 'asistencias') {
      this.cargarAsistenciasGlobales();
    }
  }

  cargarCalificacionesGlobales() {
    this.cargandoCalificaciones.set(true);
    this.alumnoService.getCalificacionesGlobales().subscribe({
      next: (data) => {
        this.calificacionesGlobales.set(data);
        this.cargandoCalificaciones.set(false);
      },
      error: () => this.cargandoCalificaciones.set(false)
    });
  }

  cargarAsistenciasGlobales() {
    this.cargandoAsistencias.set(true);
    this.alumnoService.getAsistenciaGlobal().subscribe({
      next: (data) => {
        this.asistenciasGlobales.set(data);
        this.cargandoAsistencias.set(false);
      },
      error: () => this.cargandoAsistencias.set(false)
    });
  }

  toggleDropdown() { this.dropdownOpen.update(v => !v); }

  /** Abre la vista de detalle para el curso seleccionado */
  abrirDetalleCurso(curso: Curso) {
    this.cursoActivo.set(curso);
  }

  entregarTarea(t: TareaAlumnoExt) {
    this.alumnoService.entregarTarea(t.idAulaCurso, t.idTarea)
      .subscribe({
        next: () => {
          this.ngOnInit();
        },
        error: () => {
          alert('Error al entregar la tarea.');
        }
      });
  }

  anularEntrega(t: TareaAlumnoExt) {
    this.alumnoService.anularTarea(t.idAulaCurso, t.idTarea)
      .subscribe({
        next: () => {
          this.ngOnInit();
        },
        error: () => {
          alert('Error al anular la entrega.');
        }
      });
  }

  // ── Kanban Drag & Drop Methods ────────────────────────
  onDragStart(event: DragEvent, tarea: TareaAlumnoExt) {
    this.draggedTarea = tarea;
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', String(tarea.idTarea));
      event.dataTransfer.effectAllowed = 'move';
    }
    const target = event.target as HTMLElement;
    target.classList.add('dragging');
  }

  onDragEnd(event: DragEvent) {
    this.draggedTarea = null;
    this.activeDragOverCol.set(null);
    const target = event.target as HTMLElement;
    target.classList.remove('dragging');
  }

  onDragOver(event: DragEvent, col: string) {
    if (this.draggedTarea) {
      event.preventDefault();
      this.activeDragOverCol.set(col);
    }
  }

  onDragLeave(event: DragEvent, col: string) {
    if (this.activeDragOverCol() === col) {
      this.activeDragOverCol.set(null);
    }
  }

  onDrop(event: DragEvent, col: string) {
    event.preventDefault();
    this.activeDragOverCol.set(null);
    if (!this.draggedTarea) return;

    const t = this.draggedTarea;
    this.draggedTarea = null;

    if (col === 'pendiente') {
      if (t.entregado) {
        this.anularEntrega(t);
      }
    } else if (col === 'entregado') {
      if (!t.entregado) {
        this.entregarTarea(t);
      } else if (t.nota !== null) {
        alert('No se puede descalificar una tarea calificada directamente.');
      }
    } else if (col === 'calificado') {
      alert('Las tareas solo pueden ser calificadas por el docente.');
    }
  }

  /** Vuelve a la grid de cursos */
  volverAInicio() {
    this.cursoActivo.set(null);
  }

  pendientes = computed(() => this.actividades().filter(a => a.estado === 'pendiente').length);

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const t = e.target as HTMLElement;
    if (!t.closest('.pa-avatar-wrapper')) this.dropdownOpen.set(false);
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  // ── Helper Calendario Métodos ────────────────────────
  cambiarMes(offset: number) {
    this.fechaCalendario.update(d => {
      const nuevo = new Date(d.getFullYear(), d.getMonth() + offset, 1);
      return nuevo;
    });
  }

  private formatDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private isSameDay(d1: Date, d2: Date): boolean {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  // ── Helper Recursos Métodos ────────────────────────
  tipoIcon(tipo: string): string {
    const icons: Record<string, string> = {
      pdf: '📄', word: '📝', url: '🔗', video: '🎬', youtube: '▶️',
    };
    return icons[tipo] ?? '📎';
  }

  private formatDateReadable(dateStr: string): string {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
    return dateStr;
  }

  private cargarHorarioSemanal() {
    this.alumnoService.getHorario().subscribe({
      next: (data) => {
        const slots = [
          { hora: '07:30 - 09:00', lunes: '', martes: '', miercoles: '', jueves: '', viernes: '' },
          { hora: '09:00 - 10:30', lunes: '', martes: '', miercoles: '', jueves: '', viernes: '' },
          { hora: '10:30 - 11:00', lunes: 'Recreo', martes: 'Recreo', miercoles: 'Recreo', jueves: 'Recreo', viernes: 'Recreo' },
          { hora: '11:00 - 12:30', lunes: '', martes: '', miercoles: '', jueves: '', viernes: '' },
          { hora: '12:30 - 14:00', lunes: '', martes: '', miercoles: '', jueves: '', viernes: '' }
        ];

        const mapDiaSemana: Record<number, string> = {
          1: 'lunes',
          2: 'martes',
          3: 'miercoles',
          4: 'jueves',
          5: 'viernes'
        };

        data.forEach(block => {
          const key = mapDiaSemana[block.dia];
          if (!key) return;

          let slotIndex = -1;
          if (block.horaInicio === '07:30') slotIndex = 0;
          else if (block.horaInicio === '09:00') slotIndex = 1;
          else if (block.horaInicio === '11:00') slotIndex = 3;
          else if (block.horaInicio === '12:30') slotIndex = 4;
          else {
            const startHour = parseInt(block.horaInicio.split(':')[0], 10);
            if (startHour < 9) slotIndex = 0;
            else if (startHour < 11) slotIndex = 1;
            else if (startHour < 12) slotIndex = 3;
            else slotIndex = 4;
          }

          if (slotIndex !== -1) {
            (slots[slotIndex] as any)[key] = block.curso;
          }
        });

        this.horarioSemanal = slots;
      },
      error: (err) => {
        console.error('Error al cargar horario del alumno', err);
      }
    });
  }

  cargarRecursos() {
    this.alumnoService.getRecursos().subscribe({
      next: (data) => {
        this.listadoRecursos = data.map(r => ({
          nombre: r.nombre,
          desc: r.descripcion,
          url: r.url,
          cat: r.categoria,
          tipo: r.tipo
        }));
      },
      error: (err) => {
        console.error('Error al cargar recursos de la biblioteca', err);
      }
    });
  }

  ngOnDestroy() {
    this.ws.disconnect();
  }
}
