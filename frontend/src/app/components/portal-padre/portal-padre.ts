import { Component, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

type Seccion = 'inicio' | 'cursos' | 'asistencia' | 'mensajes' | 'eventos' | 'pagos';
type Vista   = 'dashboard' | 'detalle';
type Estado  = 'bueno' | 'observacion' | 'riesgo';

interface CursoDetalle {
  nombre: string;
  progreso: number;
  tareasEntregadas: number;
  totalTareas: number;
  puntualidad: number;
}

interface Hijo {
  id: number;
  nombre: string;
  grado: string;
  codigo: string;
  estado: Estado;
  promedio: number;
  asistencia: number;
  cursosRiesgo: number;
  entregaTareas: number;
  descripcion: string;
  cursosMonitor: { nombre: string; progreso: number }[];
  cursos: CursoDetalle[];
  eventos: string[];
}

@Component({
  selector: 'app-portal-padre',
  imports: [],
  templateUrl: './portal-padre.html',
  styleUrl: './portal-padre.scss',
})
export class PortalPadre {
  private auth   = inject(AuthService);
  private router = inject(Router);

  seccionActiva  = signal<Seccion>('inicio');
  vista          = signal<Vista>('dashboard');
  hijoIdx        = signal<number>(0);
  menuUsuario    = signal(false);

  nombrePadre    = this.auth.getNombre() ?? 'Padre';
  codigoPadre    = this.auth.getCodigo() ?? '';

  get inicialesP(): string {
    return this.nombrePadre.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  navItems: { id: Seccion; label: string; icon: string }[] = [
    { id: 'inicio',     label: 'Inicio',     icon: 'home'    },
    { id: 'cursos',     label: 'Cursos',     icon: 'book'    },
    { id: 'asistencia', label: 'Asistencia', icon: 'check'   },
    { id: 'mensajes',   label: 'Mensajes',   icon: 'message' },
    { id: 'eventos',    label: 'Eventos',    icon: 'calendar'},
    { id: 'pagos',      label: 'Pagos',      icon: 'card'    },
  ];

  hijos: Hijo[] = [
    {
      id: 1,
      nombre: 'Carlos Fernando Martínez',
      grado: '2° de Secundaria',
      codigo: '5B111810',
      estado: 'riesgo',
      promedio: 13.5,
      asistencia: 72,
      cursosRiesgo: 3,
      entregaTareas: 60,
      descripcion: 'Requiere apoyo en varias materias. Se recomienda comunicación con los docentes.',
      cursosMonitor: [
        { nombre: 'Matemática', progreso: 45 },
        { nombre: 'Comunicación', progreso: 60 },
        { nombre: 'Ciencia', progreso: 40 },
      ],
      cursos: [
        { nombre: 'Matemática',    progreso: 45, tareasEntregadas: 5,  totalTareas: 10, puntualidad: 60 },
        { nombre: 'Comunicación',  progreso: 60, tareasEntregadas: 7,  totalTareas: 10, puntualidad: 70 },
        { nombre: 'Ciencia',       progreso: 40, tareasEntregadas: 4,  totalTareas: 10, puntualidad: 55 },
        { nombre: 'Historia',      progreso: 55, tareasEntregadas: 6,  totalTareas: 10, puntualidad: 65 },
        { nombre: 'Inglés',        progreso: 50, tareasEntregadas: 5,  totalTareas: 10, puntualidad: 60 },
        { nombre: 'Arte',          progreso: 70, tareasEntregadas: 8,  totalTareas: 10, puntualidad: 80 },
      ],
      eventos: ['Examen Matemática (5 abril)', 'Reunión padres (20 abril)', 'Recuperación Ciencia (22 abril)'],
    },
    {
      id: 2,
      nombre: 'Jesús Fernando Martínez',
      grado: '5° de Secundaria',
      codigo: '5B111809',
      estado: 'observacion',
      promedio: 16.8,
      asistencia: 90,
      cursosRiesgo: 1,
      entregaTareas: 85,
      descripcion: 'Desempeño satisfactorio. Un curso requiere atención adicional.',
      cursosMonitor: [
        { nombre: 'Matemática',   progreso: 70 },
        { nombre: 'Comunicación', progreso: 85 },
        { nombre: 'Ciencia',      progreso: 50 },
      ],
      cursos: [
        { nombre: 'Matemática',    progreso: 70, tareasEntregadas: 8,  totalTareas: 10, puntualidad: 80 },
        { nombre: 'Comunicación',  progreso: 85, tareasEntregadas: 9,  totalTareas: 10, puntualidad: 90 },
        { nombre: 'Ciencia',       progreso: 50, tareasEntregadas: 6,  totalTareas: 10, puntualidad: 65 },
        { nombre: 'Historia',      progreso: 80, tareasEntregadas: 9,  totalTareas: 10, puntualidad: 85 },
        { nombre: 'Inglés',        progreso: 78, tareasEntregadas: 8,  totalTareas: 10, puntualidad: 88 },
        { nombre: 'Arte',          progreso: 90, tareasEntregadas: 10, totalTareas: 10, puntualidad: 95 },
      ],
      eventos: ['Examen Comunicación (2 abril)', 'Reunión padres (20 abril)', 'Proyecto Ciencia (28 abril)'],
    },
    {
      id: 3,
      nombre: 'Diana Fernando Martínez',
      grado: '3° de Secundaria',
      codigo: '5B111808',
      estado: 'bueno',
      promedio: 18.2,
      asistencia: 95,
      cursosRiesgo: 0,
      entregaTareas: 100,
      descripcion: 'Desempeño académico sobresaliente en todos los cursos.',
      cursosMonitor: [
        { nombre: 'Matemática',   progreso: 88 },
        { nombre: 'Comunicación', progreso: 90 },
        { nombre: 'Ciencia',      progreso: 85 },
      ],
      cursos: [
        { nombre: 'Matemática',    progreso: 88, tareasEntregadas: 10, totalTareas: 10, puntualidad: 100 },
        { nombre: 'Comunicación',  progreso: 90, tareasEntregadas: 10, totalTareas: 10, puntualidad: 100 },
        { nombre: 'Ciencia',       progreso: 85, tareasEntregadas: 8,  totalTareas: 8,  puntualidad: 100 },
        { nombre: 'Historia del Perú', progreso: 92, tareasEntregadas: 9, totalTareas: 9, puntualidad: 100 },
        { nombre: 'Inglés',        progreso: 87, tareasEntregadas: 10, totalTareas: 10, puntualidad: 100 },
        { nombre: 'Arte',          progreso: 95, tareasEntregadas: 10, totalTareas: 10, puntualidad: 100 },
      ],
      eventos: ['Examen Comunicación (2 abril)', 'Reunión padres (20 abril)', 'Proyecto final Ciencia (28 abril)'],
    },
  ];

  hijosEnRiesgo = computed(() => this.hijos.filter(h => h.estado === 'riesgo').length);

  hijoActual = computed(() => this.hijos[this.hijoIdx()]);

  setSeccion(s: Seccion) {
    this.seccionActiva.set(s);
    if (s !== 'inicio') this.vista.set('dashboard');
  }

  verDetalle(idx: number) {
    this.hijoIdx.set(idx);
    this.vista.set('detalle');
  }

  volverDashboard() {
    this.vista.set('dashboard');
  }

  getBarColor(p: number): string {
    if (p >= 80) return '#22c55e';
    if (p >= 60) return '#eab308';
    return '#c1121f';
  }

  getEstadoLabel(e: Estado): string {
    return e === 'bueno' ? 'Bueno' : e === 'observacion' ? 'En observación' : 'En riesgo';
  }

  getDesempeno(p: number): string {
    if (p >= 80) return 'Excelente';
    if (p >= 60) return 'Regular';
    return 'Necesita mejorar';
  }

  toggleMenuUsuario() { this.menuUsuario.update(v => !v); }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
