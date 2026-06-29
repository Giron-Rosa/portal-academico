import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';

type Seccion = 'dashboard' | 'estudiantes' | 'docentes' | 'padres' | 'kanban';

interface Kpis {
  totalEstudiantes: number;
  totalDocentes: number;
  totalCursos: number;
  morosidadPct: number;
}

interface Estudiante {
  idAlumno: number;
  codigo: string;
  nombre: string;
  apellido: string;
  grado: string;
  seccion: string;
  email: string;
  estado: string;
}

interface Docente {
  idMaestro: number;
  codigo: string;
  nombre: string;
  apellido: string;
  especialidad: string;
  email: string;
  departamento: string;
  activo: boolean;
}

interface Padre {
  idPadre: number;
  codigo: string;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  dni: string;
  hijosVinculados: string;
}

interface NotaKanban {
  idNota?: number;
  titulo: string;
  descripcion: string;
  prioridad: 'alta' | 'media' | 'baja';
  estado: 'pendiente' | 'en_progreso' | 'completada';
  responsable: string;
  fechaLimite: string;
  etiquetas: string;
}

@Component({
  selector: 'app-portal-admin',
  imports: [FormsModule],
  templateUrl: './portal-admin.html',
  styleUrl: './portal-admin.scss',
})
export class PortalAdmin implements OnInit {
  private router = inject(Router);
  private auth   = inject(AuthService);
  private http   = inject(HttpClient);

  private readonly API_BASE = 'http://localhost:8080/api/admin';

  nombreAdmin = this.auth.getNombre() ?? 'Administrador';
  codigoAdmin = this.auth.getCodigo() ?? 'ADM-001';

  today = new Date().toISOString().substring(0, 10);
  seccionActiva = signal<Seccion>('dashboard');
  cargando = signal(false);
  errorCarga = signal('');

  // Data signals
  kpis = signal<Kpis>({ totalEstudiantes: 0, totalDocentes: 0, totalCursos: 0, morosidadPct: 0 });
  estudiantes = signal<Estudiante[]>([]);
  docentes = signal<Docente[]>([]);
  padres = signal<Padre[]>([]);
  notas = signal<NotaKanban[]>([]);

  // Kanban lists
  notasPendientes = computed(() => this.notas().filter(n => n.estado === 'pendiente'));
  notasEnProgreso = computed(() => this.notas().filter(n => n.estado === 'en_progreso'));
  notasCompletadas = computed(() => this.notas().filter(n => n.estado === 'completada'));

  // Modales
  modalAbierto = signal<'estudiante' | 'docente' | 'padre' | 'nota' | null>(null);
  modoEdicion = signal(false);
  idSeleccionado = signal<number | null>(null);

  // Form Fields
  formEstudiante = { nombre: '', apellido: '', email: '', grado: '5to Secundaria', seccion: 'B', fechaNacimiento: '2008-01-10', dni: '' };
  formDocente = { nombre: '', apellido: '', email: '', especialidad: 'Matemática', departamento: 'Académico', dni: '', telefono: '' };
  formPadre = { nombre: '', apellido: '', email: '', telefono: '', dni: '' };
  formNota = { titulo: '', descripcion: '', prioridad: 'media' as 'alta'|'media'|'baja', estado: 'pendiente' as 'pendiente'|'en_progreso'|'completada', responsable: '', fechaLimite: '', etiquetas: '' };

  get iniciales(): string {
    return this.nombreAdmin.split(' ').map(w => w[0]).slice(0,2).join('').toUpperCase();
  }

  ngOnInit() {
    this.cargarDatos();
  }

  setSeccion(sec: Seccion) {
    this.seccionActiva.set(sec);
    this.cargarDatos();
  }

  private getHeaders(): HttpHeaders {
    const token = this.auth.getToken();
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  cargarDatos() {
    this.cargando.set(true);
    this.errorCarga.set('');
    const headers = this.getHeaders();

    if (this.seccionActiva() === 'dashboard') {
      this.http.get<Kpis>(`${this.API_BASE}/dashboard/kpis`, { headers }).subscribe({
        next: (data) => { this.kpis.set(data); this.cargando.set(false); },
        error: () => { this.errorCarga.set('Error al cargar KPIs.'); this.cargando.set(false); }
      });
    } else if (this.seccionActiva() === 'estudiantes') {
      this.http.get<Estudiante[]>(`${this.API_BASE}/estudiantes`, { headers }).subscribe({
        next: (data) => { this.estudiantes.set(data); this.cargando.set(false); },
        error: () => { this.errorCarga.set('Error al cargar estudiantes.'); this.cargando.set(false); }
      });
    } else if (this.seccionActiva() === 'docentes') {
      this.http.get<Docente[]>(`${this.API_BASE}/docentes`, { headers }).subscribe({
        next: (data) => { this.docentes.set(data); this.cargando.set(false); },
        error: () => { this.errorCarga.set('Error al cargar docentes.'); this.cargando.set(false); }
      });
    } else if (this.seccionActiva() === 'padres') {
      this.http.get<Padre[]>(`${this.API_BASE}/padres`, { headers }).subscribe({
        next: (data) => { this.padres.set(data); this.cargando.set(false); },
        error: () => { this.errorCarga.set('Error al cargar apoderados.'); this.cargando.set(false); }
      });
    } else if (this.seccionActiva() === 'kanban') {
      this.http.get<NotaKanban[]>(`${this.API_BASE}/notas-kanban`, { headers }).subscribe({
        next: (data) => { this.notas.set(data); this.cargando.set(false); },
        error: () => { this.errorCarga.set('Error al cargar el tablero Kanban.'); this.cargando.set(false); }
      });
    }
  }

  // Modales Open/Close
  abrirNuevo(tipo: 'estudiante' | 'docente' | 'padre' | 'nota') {
    this.modoEdicion.set(false);
    this.idSeleccionado.set(null);
    this.modalAbierto.set(tipo);

    // Reset forms
    if (tipo === 'estudiante') this.formEstudiante = { nombre: '', apellido: '', email: '', grado: '5to Secundaria', seccion: 'B', fechaNacimiento: '2008-01-10', dni: '' };
    if (tipo === 'docente') this.formDocente = { nombre: '', apellido: '', email: '', especialidad: 'Matemática', departamento: 'Académico', dni: '', telefono: '' };
    if (tipo === 'padre') this.formPadre = { nombre: '', apellido: '', email: '', telefono: '', dni: '' };
    if (tipo === 'nota') this.formNota = { titulo: '', descripcion: '', prioridad: 'media', estado: 'pendiente', responsable: '', fechaLimite: new Date().toISOString().substring(0,10), etiquetas: '' };
  }

  abrirEditar(tipo: 'estudiante' | 'docente' | 'padre' | 'nota', item: any) {
    this.modoEdicion.set(true);
    this.modalAbierto.set(tipo);

    if (tipo === 'estudiante') {
      this.idSeleccionado.set(item.idAlumno);
      this.formEstudiante = { nombre: item.nombre, apellido: item.apellido, email: item.email, grado: item.grado, seccion: item.seccion, fechaNacimiento: '2008-01-10', dni: '' };
    }
    if (tipo === 'docente') {
      this.idSeleccionado.set(item.idMaestro);
      this.formDocente = { nombre: item.nombre, apellido: item.apellido, email: item.email, especialidad: item.especialidad, departamento: item.departamento, dni: '', telefono: '' };
    }
    if (tipo === 'padre') {
      this.idSeleccionado.set(item.idPadre);
      this.formPadre = { nombre: item.nombre, apellido: item.apellido, email: item.email, telefono: item.telefono, dni: item.dni };
    }
    if (tipo === 'nota') {
      this.idSeleccionado.set(item.idNota);
      this.formNota = { titulo: item.titulo, descripcion: item.descripcion, prioridad: item.prioridad, estado: item.estado, responsable: item.responsable, fechaLimite: item.fechaLimite, etiquetas: item.etiquetas };
    }
  }

  cerrarModal() { this.modalAbierto.set(null); }

  // Submit operations
  guardar() {
    const headers = this.getHeaders();
    const tipo = this.modalAbierto();
    const edicion = this.modoEdicion();
    const id = this.idSeleccionado();

    this.cargando.set(true);

    if (tipo === 'estudiante') {
      const req = this.formEstudiante;
      const obs = edicion 
        ? this.http.put<Estudiante>(`${this.API_BASE}/estudiantes/${id}`, req, { headers })
        : this.http.post<Estudiante>(`${this.API_BASE}/estudiantes`, req, { headers });
      obs.subscribe({ next: () => { this.cerrarModal(); this.cargarDatos(); }, error: () => { alert('Error al guardar estudiante.'); this.cargando.set(false); } });
    }
    else if (tipo === 'docente') {
      const req = this.formDocente;
      const obs = edicion 
        ? this.http.put<Docente>(`${this.API_BASE}/docentes/${id}`, req, { headers })
        : this.http.post<Docente>(`${this.API_BASE}/docentes`, req, { headers });
      obs.subscribe({ next: () => { this.cerrarModal(); this.cargarDatos(); }, error: () => { alert('Error al guardar docente.'); this.cargando.set(false); } });
    }
    else if (tipo === 'padre') {
      const req = this.formPadre;
      const obs = edicion 
        ? this.http.put<Padre>(`${this.API_BASE}/padres/${id}`, req, { headers })
        : this.http.post<Padre>(`${this.API_BASE}/padres`, req, { headers });
      obs.subscribe({ next: () => { this.cerrarModal(); this.cargarDatos(); }, error: () => { alert('Error al guardar apoderado.'); this.cargando.set(false); } });
    }
    else if (tipo === 'nota') {
      const req = this.formNota;
      if (req.fechaLimite && req.fechaLimite < this.today) {
        alert('Error: La fecha límite no puede estar en el pasado.');
        this.cargando.set(false);
        return;
      }
      const obs = edicion 
        ? this.http.put<NotaKanban>(`${this.API_BASE}/notas-kanban/${id}`, req, { headers })
        : this.http.post<NotaKanban>(`${this.API_BASE}/notas-kanban`, req, { headers });
      obs.subscribe({ next: () => { this.cerrarModal(); this.cargarDatos(); }, error: () => { alert('Error al guardar nota.'); this.cargando.set(false); } });
    }
  }

  exportarEstudiantes(formato: 'excel' | 'pdf') {
    const headers = this.getHeaders();
    const endpoint = formato === 'excel' ? 'excel' : 'pdf';
    const url = `http://localhost:8080/api/admin/export/estudiantes/${endpoint}`;

    this.http.get(url, { headers, responseType: 'blob' }).subscribe({
      next: (blob) => {
        const type = formato === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          : 'application/pdf';
        const file = new Blob([blob], { type });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(file);
        link.download = `reporte_estudiantes_${this.today}.${formato === 'excel' ? 'xlsx' : 'pdf'}`;
        link.click();
      },
      error: () => alert('Error al descargar el reporte.')
    });
  }

  eliminar(tipo: 'estudiante' | 'docente' | 'padre' | 'nota', id: number) {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;
    const headers = this.getHeaders();
    this.cargando.set(true);

    const ruta = tipo === 'estudiante' ? `estudiantes` : tipo === 'docente' ? `docentes` : tipo === 'padre' ? `padres` : `notas-kanban`;
    this.http.delete(`${this.API_BASE}/${ruta}/${id}`, { headers }).subscribe({
      next: () => { this.cargarDatos(); },
      error: () => { alert('Error al eliminar registro.'); this.cargando.set(false); }
    });
  }

  cambiarEstadoNota(nota: NotaKanban, nuevoEstado: 'pendiente' | 'en_progreso' | 'completada') {
    const headers = this.getHeaders();
    const notaActualizada = { ...nota, estado: nuevoEstado };
    this.http.put<NotaKanban>(`${this.API_BASE}/notas-kanban/${nota.idNota}`, notaActualizada, { headers }).subscribe({
      next: () => { this.cargarDatos(); },
      error: () => { alert('Error al mover la nota.'); }
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
