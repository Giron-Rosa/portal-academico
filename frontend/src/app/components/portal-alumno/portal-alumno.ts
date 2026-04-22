import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type Seccion = 'inicio' | 'calendario' | 'kanban' | 'refuerzo' | 'recursos';

interface CursoApi {
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

@Component({
  selector: 'app-portal-alumno',
  imports: [],
  templateUrl: './portal-alumno.html',
  styleUrl: './portal-alumno.scss',
})
export class PortalAlumno implements OnInit {
  private router = inject(Router);
  private auth   = inject(AuthService);
  private http   = inject(HttpClient);

  private readonly API = 'http://localhost:8080/api/portal/alumno/mis-cursos';

  seccionActiva = signal<Seccion>('inicio');
  dropdownOpen  = signal(false);
  periodo       = signal('');
  cargando      = signal(true);
  errorCarga    = signal('');
  cursos        = signal<Curso[]>([]);

  nombre    = this.auth.getNombre() ?? 'Estudiante';
  codigo    = this.auth.getCodigo() ?? '';
  iniciales = this.nombre.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();

  navItems: { id: Seccion; label: string; icon: string }[] = [
    { id: 'inicio',     label: 'Inicio',     icon: 'home'     },
    { id: 'calendario', label: 'Calendario', icon: 'calendar' },
    { id: 'kanban',     label: 'Kanban',     icon: 'kanban'   },
    { id: 'refuerzo',   label: 'Refuerzo',   icon: 'refuerzo' },
    { id: 'recursos',   label: 'Recursos',   icon: 'recursos' },
  ];

  actividades: Actividad[] = [
    { tipo: 'Evaluación',  titulo: 'Práctica calificada',    curso: 'Matemática',          vence: '25/04 · 11:59 PM', estado: 'pendiente' },
    { tipo: 'Tarea',       titulo: 'Ensayo narrativo',        curso: 'Comunicación',         vence: '28/04 · 11:59 PM', estado: 'pendiente' },
    { tipo: 'Laboratorio', titulo: 'Informe de experimento',  curso: 'Ciencia y Tecnología', vence: '30/04 · 11:59 PM', estado: 'pendiente' },
    { tipo: 'Examen',      titulo: 'Quiz de vocabulario',     curso: 'Inglés',               vence: '26/04 · 08:00 AM', estado: 'vencido'   },
  ];

  private readonly COLORES: Record<string, string> = {
    'Matemática':                       '#dce8f7',
    'Comunicación':                     '#fde8e8',
    'Ciencia y Tecnología':             '#e8f7ec',
    'Historia, Geografía y Economía':   '#f0e8f7',
    'Inglés':                           '#fef9e0',
    'Arte y Cultura':                   '#fde0ec',
    'Educación Física':                 '#e0f7ec',
    'Personal Social':                  '#e8f0fe',
    'Religión':                         '#f7f0e8',
  };

  private readonly AREA_KEY: Record<string, string> = {
    'Matemática':    'mat',
    'Comunicación':  'com',
    'Ciencias':      'cie',
    'Sociales':      'his',
    'Idiomas':       'ing',
    'Arte':          'art',
    'Educación Física': 'efi',
    'Formación':     'rel',
  };

  ngOnInit() {
    const token = this.auth.getToken();
    if (!token) { this.router.navigate(['/']); return; }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<CursoApi[]>(this.API, { headers }).subscribe({
      next: (data) => {
        if (data.length > 0) this.periodo.set(data[0].periodo);
        this.cursos.set(data.map(d => ({
          nombre:      d.nombre,
          grado:       d.grado,
          seccion:     d.seccion,
          turno:       d.turno,
          horasSemana: d.horasSemana,
          docente:     d.docente,
          color:       this.COLORES[d.nombre] ?? '#e8f0fb',
          areaKey:     this.AREA_KEY[d.area]  ?? 'gen',
        })));
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set('No se pudieron cargar los cursos. Intenta de nuevo.');
        this.cargando.set(false);
      },
    });
  }

  setSeccion(id: Seccion) { this.seccionActiva.set(id); this.dropdownOpen.set(false); }
  toggleDropdown()        { this.dropdownOpen.update(v => !v); }

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
}
