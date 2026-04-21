import { Component, inject, signal, computed, HostListener } from '@angular/core';
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
  imports: [],
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
  }

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
