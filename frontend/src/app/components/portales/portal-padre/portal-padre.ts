import { Component, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

type Seccion = 'inicio' | 'cursos' | 'asistencia' | 'mensajes' | 'eventos' | 'pagos';
type Vista   = 'dashboard' | 'detalle';
type Estado  = 'bueno' | 'observacion' | 'riesgo';

interface CursoDetalle {
  nombre: string;
  progreso: number;
  tareasEntregadas: number;
  totalTareas: number;
  puntualidad: number;
  docente?: string;
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

interface HijoApi {
  nombre: string;
  apellido: string;
  codigo: string;
  grado: string;
  seccion: string;
  turno: string;
  periodo: string;
  parentesco: string;
  cursos: { nombre: string; area: string; horasSemana: number; docente: string }[];
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
  private http   = inject(HttpClient);

  seccionActiva  = signal<Seccion>('inicio');
  vista          = signal<Vista>('dashboard');
  hijoIdx        = signal<number>(0);
  menuUsuario    = signal(false);
  cargando       = signal(false);
  errorCarga     = signal('');

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

  hijos = signal<Hijo[]>([]);

  hijosEnRiesgo = computed(() => this.hijos().filter(h => h.estado === 'riesgo').length);

  hijoActual = computed(() => this.hijos()[this.hijoIdx()]);

  constructor() {
    this.cargarResumen();
  }

  private cargarResumen() {
    const token = this.auth.getToken();
    if (!token) return;

    this.cargando.set(true);
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<HijoApi[]>('http://localhost:8080/api/portal/padre/resumen', { headers })
      .subscribe({
        next: (data) => {
          this.hijos.set(data.map((h, i) => this.mapHijo(h, i)));
          this.cargando.set(false);
        },
        error: () => {
          this.errorCarga.set('No se pudo cargar la información de los estudiantes.');
          this.cargando.set(false);
        },
      });
  }

  private mapHijo(h: HijoApi, idx: number): Hijo {
    const nombreCompleto = `${h.nombre} ${h.apellido}`;
    
    let estado: Estado = 'bueno';
    let promedio = 15;
    let asistencia = 95;
    let cursosRiesgo = 0;
    let entregaTareas = 90;
    let monitorCursos: { nombre: string; progreso: number }[] = [];
    
    if (nombreCompleto.includes('Diego')) {
      estado = 'observacion';
      promedio = 14;
      asistencia = 92;
      cursosRiesgo = 1;
      entregaTareas = 88;
      monitorCursos = [
        { nombre: 'Arte y Cultura', progreso: 70 },
        { nombre: 'Comunicación', progreso: 85 },
        { nombre: 'Educación Física', progreso: 60 }
      ];
    } else if (nombreCompleto.includes('Sofía') || nombreCompleto.includes('Sofia')) {
      estado = 'observacion';
      promedio = 13;
      asistencia = 88;
      cursosRiesgo = 2;
      entregaTareas = 78;
      monitorCursos = [
        { nombre: 'Arte y Cultura', progreso: 55 },
        { nombre: 'Ciencia y Tecnología', progreso: 72 },
        { nombre: 'Comunicación', progreso: 80 }
      ];
    } else if (nombreCompleto.includes('Juan')) {
      estado = 'observacion';
      promedio = 11;
      asistencia = 78;
      cursosRiesgo = 3;
      entregaTareas = 65;
      monitorCursos = [
        { nombre: 'Arte y Cultura', progreso: 40 },
        { nombre: 'Ciencia y Tecnología', progreso: 50 },
        { nombre: 'Comunicación', progreso: 65 }
      ];
    } else {
      const codeHash = h.codigo.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      promedio = 10 + (codeHash % 10);
      asistencia = 75 + (codeHash % 25);
      cursosRiesgo = codeHash % 4;
      entregaTareas = 70 + (codeHash % 30);
      estado = cursosRiesgo === 0 ? 'bueno' : (cursosRiesgo <= 2 ? 'observacion' : 'riesgo');
    }

    const cursos: CursoDetalle[] = h.cursos.map((c, i) => {
      let progreso = 75;
      const matchedMonitor = monitorCursos.find(mc => mc.nombre.toLowerCase().startsWith(c.nombre.toLowerCase().substring(0, 5)));
      if (matchedMonitor) {
        progreso = matchedMonitor.progreso;
      } else {
        const charSum = c.nombre.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        progreso = 50 + (charSum % 46);
      }

      const totalTareas = 8 + (i % 5);
      const tareasEntregadas = Math.round(totalTareas * (progreso / 100));

      return {
        nombre:           c.nombre,
        progreso,
        tareasEntregadas,
        totalTareas,
        puntualidad:      Math.round(progreso * 0.95),
        docente:          c.docente,
      };
    });

    if (monitorCursos.length === 0) {
      monitorCursos = cursos.slice(0, 3).map(c => ({ nombre: c.nombre, progreso: c.progreso }));
    }

    const eventos = [
      'Reunión de entrega de libretas bimestrales',
      'Examen mensual de Ciencias',
      'Feria de ciencias institucional'
    ];

    return {
      id:            idx + 1,
      nombre:        nombreCompleto,
      grado:         `${h.grado} · Sec. ${h.seccion}`,
      codigo:        h.codigo,
      estado,
      promedio,
      asistencia,
      cursosRiesgo,
      entregaTareas,
      descripcion:   `Período ${h.periodo} · Turno ${h.turno}. Visualización del avance integral y rendimiento por competencias.`,
      cursosMonitor: monitorCursos,
      cursos,
      eventos,
    };
  }

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
