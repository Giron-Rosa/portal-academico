import { Component, inject, signal, OnInit, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CursoDetalle } from './curso-detalle/curso-detalle';
import type { TareaAlumno, ActividadAlumno, MaterialAlumno } from './curso-detalle/curso-detalle';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

type Seccion = 'inicio' | 'calendario' | 'kanban' | 'refuerzo' | 'recursos';

interface CursoApi {
  idAulaCurso: number;
  nombre: string;
  area: string;
  horasSemana: number;
  grado: string;
  seccion: string;
  turno: string;
  periodo: string;
  docente: string;
}

export interface Curso {
  idAulaCurso: number;
  nombre: string;
  grado: string;
  seccion: string;
  turno: string;
  horasSemana: number;
  docente: string;
  color: string;
  areaKey: string;
}

interface Actividad {
  tipo: string;
  titulo: string;
  curso: string;
  vence: string;
  estado: 'pendiente' | 'entregado' | 'vencido';
}

export interface TareaAlumnoExt extends TareaAlumno {
  idAulaCurso: number;
  cursoNombre: string;
}

export interface ActividadAlumnoExt extends ActividadAlumno {
  idAulaCurso: number;
  cursoNombre: string;
}

export interface MaterialAlumnoExt extends MaterialAlumno {
  idAulaCurso: number;
  cursoNombre: string;
}

@Component({
  selector: 'app-portal-alumno',
  imports: [CommonModule, CursoDetalle],
  templateUrl: './portal-alumno.html',
  styleUrl: './portal-alumno.scss',
})
export class PortalAlumno implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);
  private http = inject(HttpClient);

  private readonly API = 'http://localhost:8080/api/portal/alumno/mis-cursos';

  seccionActiva = signal<Seccion>('inicio');
  dropdownOpen = signal(false);
  periodo = signal('');
  cargando = signal(true);
  errorCarga = signal('');
  cursos = signal<Curso[]>([]);

  /** Curso activo para la vista de detalle (null = mostrar grid) */
  cursoActivo = signal<Curso | null>(null);

  nombre = this.auth.getNombre() ?? 'Estudiante';
  codigo = this.auth.getCodigo() ?? '';
  iniciales = this.nombre.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();

  navItems: { id: Seccion; label: string; icon: string }[] = [
    { id: 'inicio', label: 'Inicio', icon: 'home' },
    { id: 'calendario', label: 'Calendario', icon: 'calendar' },
    { id: 'kanban', label: 'Tablero Kanban', icon: 'kanban' },
    { id: 'refuerzo', label: 'Refuerzo', icon: 'refuerzo' },
    { id: 'recursos', label: 'Recursos', icon: 'recursos' },
  ];

  actividades: Actividad[] = [
    { tipo: 'Evaluación', titulo: 'Práctica calificada', curso: 'Matemática', vence: '25/04 · 11:59 PM', estado: 'pendiente' },
    { tipo: 'Tarea', titulo: 'Ensayo narrativo', curso: 'Comunicación', vence: '28/04 · 11:59 PM', estado: 'pendiente' },
    { tipo: 'Laboratorio', titulo: 'Informe de experimento', curso: 'Ciencia y Tecnología', vence: '30/04 · 11:59 PM', estado: 'pendiente' },
    { tipo: 'Examen', titulo: 'Quiz de vocabulario', curso: 'Inglés', vence: '26/04 · 08:00 AM', estado: 'vencido' },
  ];

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

    // Unir con tareas y exámenes
    const tareas = this.tareasTotal();
    const actividades = this.actividadesTotal();

    dias.forEach(dia => {
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

  ngOnInit() {
    const token = this.auth.getToken();
    if (!token) { this.router.navigate(['/']); return; }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<CursoApi[]>(this.API, { headers }).subscribe({
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
        this.cargarDatosConsolidados(mappedCursos, headers);
      },
      error: () => {
        this.errorCarga.set('No se pudieron cargar los cursos. Intenta de nuevo.');
        this.cargando.set(false);
      },
    });
  }

  private cargarDatosConsolidados(cursos: Curso[], headers: HttpHeaders) {
    if (cursos.length === 0) return;

    // Tareas
    const tareasReqs = cursos.map(c =>
      this.http.get<TareaAlumno[]>(`http://localhost:8080/api/portal/alumno/cursos/${c.idAulaCurso}/tareas`, { headers })
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
      this.http.get<ActividadAlumno[]>(`http://localhost:8080/api/portal/alumno/cursos/${c.idAulaCurso}/actividades`, { headers })
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
      this.http.get<MaterialAlumno[]>(`http://localhost:8080/api/portal/alumno/cursos/${c.idAulaCurso}/contenido`, { headers })
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
  }

  setSeccion(id: Seccion) {
    this.seccionActiva.set(id);
    this.cursoActivo.set(null);   // cerrar cualquier detalle abierto
    this.dropdownOpen.set(false);
  }
  toggleDropdown() { this.dropdownOpen.update(v => !v); }

  /** Abre la vista de detalle para el curso seleccionado */
  abrirDetalleCurso(curso: Curso) {
    this.cursoActivo.set(curso);
  }

  /** Vuelve a la grid de cursos */
  volverAInicio() {
    this.cursoActivo.set(null);
  }

  pendientes = () => this.actividades.filter(a => a.estado === 'pendiente').length;

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
}
