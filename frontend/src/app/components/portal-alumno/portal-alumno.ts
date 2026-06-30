import { Component, inject, signal, OnInit, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CursoDetalle } from './curso-detalle/curso-detalle';
import type { TareaAlumno, ActividadAlumno, MaterialAlumno } from './curso-detalle/curso-detalle';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

type Seccion = 'inicio' | 'calificaciones' | 'asistencias' | 'calendario' | 'kanban' | 'refuerzo' | 'recursos';

interface CalificacionGlobal {
  idAulaCurso: number;
  curso: string;
  bim1: number | null;
  bim2: number | null;
  bim3: number | null;
  bim4: number | null;
}

interface AsistenciaGlobal {
  idAulaCurso: number;
  curso: string;
  total: number;
  presente: number;
  tardanza: number;
  falta: number;
  justificado: number;
  porcentaje: number;
}

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

  // Horario Semanal Estático para 5to Sec B
  horarioSemanal = [
    { hora: '07:30 - 09:00', lunes: 'Matemática', martes: 'Comunicación', miercoles: 'Matemática', jueves: 'Comunicación', viernes: 'Ciencia y Tecnología' },
    { hora: '09:00 - 10:30', lunes: 'Ciencia y Tecnología', martes: 'Inglés', miercoles: 'Comunicación', jueves: 'Inglés', viernes: 'Matemática' },
    { hora: '10:30 - 11:00', lunes: 'Recreo', martes: 'Recreo', miercoles: 'Recreo', jueves: 'Recreo', viernes: 'Recreo' },
    { hora: '11:00 - 12:30', lunes: 'Historia', martes: 'Religión', miercoles: 'Historia', jueves: 'Educación Física', viernes: 'Arte y Cultura' },
    { hora: '12:30 - 14:00', lunes: 'Arte y Cultura', martes: 'Educación Física', miercoles: 'Tutoría', jueves: 'Religión', viernes: 'Historia' },
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

  listadoRecursos = [
    // Biblioteca Digital
    { nombre: 'Biblioteca Virtual San Agustín', desc: 'Accede a miles de libros, enciclopedias y lecturas digitalizadas recomendadas para secundaria.', url: 'https://biblioteca.sanagustin.edu.pe', cat: 'Biblioteca Digital', tipo: 'pdf' },
    { nombre: 'Colección de Obras Literarias', desc: 'Lecturas clásicas y contemporáneas en formato PDF para el curso de Comunicación.', url: 'https://bibliotecadigital.pe/obras_clasicas', cat: 'Biblioteca Digital', tipo: 'pdf' },
    { nombre: 'Enciclopedia Histórica del Perú', desc: 'Compendio histórico interactivo sobre el patrimonio cultural y sucesos históricos peruanos.', url: 'https://historiaperu.pe', cat: 'Biblioteca Digital', tipo: 'url' },

    // Herramientas
    { nombre: 'GeoGebra Clásico', desc: 'Herramienta interactiva para geometría, álgebra, cálculo y gráficos matemáticos en tiempo real.', url: 'https://www.geogebra.org/classic', cat: 'Herramientas', tipo: 'url' },
    { nombre: 'Calculadora Desmos', desc: 'Calculadora gráfica y científica en línea, ideal para graficar funciones complejas.', url: 'https://www.desmos.com/calculator', cat: 'Herramientas', tipo: 'url' },
    { nombre: 'Diccionario RAE', desc: 'Consulta de dudas, significados y ortografía oficial de la Real Academia Española.', url: 'https://dle.rae.es', cat: 'Herramientas', tipo: 'word' },

    // Enlaces Útiles
    { nombre: 'Khan Academy en Español', desc: 'Lecciones interactivas gratuitas de matemáticas, ciencia y más para todos los niveles.', url: 'https://es.khanacademy.org', cat: 'Enlaces Útiles', tipo: 'url' },
    { nombre: 'Plataforma Aprendo en Casa', desc: 'Recursos educativos complementarios aprobados por el Ministerio de Educación.', url: 'https://www.aprendoencasa.pe', cat: 'Enlaces Útiles', tipo: 'url' },

    // Plantillas
    { nombre: 'Plantilla de Monografía en APA 7', desc: 'Formato preestablecido en Word para la redacción de informes académicos con citas APA 7.', url: 'https://templates.sanagustin.edu.pe/monografia_apa7.docx', cat: 'Plantillas', tipo: 'word' },
    { nombre: 'Ficha de Análisis Literario', desc: 'Plantilla de lectura guiada para analizar personajes, temas y argumento de obras.', url: 'https://templates.sanagustin.edu.pe/analisis_literario.docx', cat: 'Plantillas', tipo: 'word' },

    // Institucional
    { nombre: 'Reglamento Interno 2026', desc: 'Manual de convivencia, derechos, deberes y normas institucionales de San Agustín.', url: 'https://sanagustin.edu.pe/institucional/reglamento2026.pdf', cat: 'Institucional', tipo: 'pdf' },
    { nombre: 'Calendario de Efemérides', desc: 'Fechas cívicas y festividades institucionales celebradas a lo largo del año escolar.', url: 'https://sanagustin.edu.pe/institucional/calendario_civico.pdf', cat: 'Institucional', tipo: 'pdf' },

    // Apoyo Académico
    { nombre: 'Guía de Hábitos de Estudio', desc: 'Consejos prácticos y técnicas de organización del tiempo para mejorar tu concentración.', url: 'https://support.sanagustin.edu.pe/habitos_estudio.pdf', cat: 'Apoyo Académico', tipo: 'pdf' },
    { nombre: 'Talleres de Reforzamiento Semanal', desc: 'Horarios de asesorías y tutorías presenciales con los profesores del colegio.', url: 'https://support.sanagustin.edu.pe/talleres.pdf', cat: 'Apoyo Académico', tipo: 'pdf' },

    // Multimedia
    { nombre: 'Canal Educativo de Ciencias', desc: 'Videos explicativos animados de física, química y biología para experimentos caseros.', url: 'https://youtube.com/c/cienciadivertida', cat: 'Multimedia', tipo: 'youtube' },
    { nombre: 'Audiolibros de Literatura Peruana', desc: 'Colección de audios con las principales leyendas y tradiciones de Ricardo Palma.', url: 'https://audiolibros.pe/tradiciones_peruanas', cat: 'Multimedia', tipo: 'video' },

    // Comunidad
    { nombre: 'Club de Ciencias San Agustín', desc: 'Inscríbete y participa en proyectos de robótica, informática y ferias de ciencias.', url: 'https://comunidad.sanagustin.edu.pe/club_ciencias', cat: 'Comunidad', tipo: 'url' },
    { nombre: 'Boletín Estudiantil "Agustino"', desc: 'Publicaciones bimestrales redactadas por alumnos para el taller de Periodismo.', url: 'https://comunidad.sanagustin.edu.pe/boletin.pdf', cat: 'Comunidad', tipo: 'pdf' },
  ];

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

    if (id === 'calificaciones') {
      this.cargarCalificacionesGlobales();
    } else if (id === 'asistencias') {
      this.cargarAsistenciasGlobales();
    }
  }

  cargarCalificacionesGlobales() {
    const token = this.auth.getToken();
    if (!token) return;
    this.cargandoCalificaciones.set(true);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<CalificacionGlobal[]>('http://localhost:8080/api/portal/alumno/calificaciones-globales', { headers }).subscribe({
      next: (data) => {
        this.calificacionesGlobales.set(data);
        this.cargandoCalificaciones.set(false);
      },
      error: () => this.cargandoCalificaciones.set(false)
    });
  }

  cargarAsistenciasGlobales() {
    const token = this.auth.getToken();
    if (!token) return;
    this.cargandoAsistencias.set(true);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<AsistenciaGlobal[]>('http://localhost:8080/api/portal/alumno/asistencia-global', { headers }).subscribe({
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
