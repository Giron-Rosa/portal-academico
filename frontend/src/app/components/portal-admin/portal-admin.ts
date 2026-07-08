import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { AdmDashboard } from './sections/adm-dashboard/adm-dashboard';
import { AdmEstudiantes } from './sections/adm-estudiantes/adm-estudiantes';
import { AdmDocentes } from './sections/adm-docentes/adm-docentes';
import { AdmApoderados } from './sections/adm-apoderados/adm-apoderados';
import { AdmKanban } from './sections/adm-kanban/adm-kanban';
import { AdmModal } from './sections/adm-modal/adm-modal';


import type {
  SeccionAdmin as Seccion,
  KpisAdmin as Kpis,
  EstudianteAdmin as Estudiante,
  DocenteAdmin as Docente,
  PadreAdmin as Padre,
  NotaKanban
} from '../../shared/models/admin.models';


@Component({
  selector: 'app-portal-admin',
  imports: [FormsModule, AdmDashboard, AdmEstudiantes, AdmDocentes, AdmApoderados, AdmKanban, AdmModal],
  templateUrl: './portal-admin.html',
  styleUrl: './portal-admin.scss',
})
export class PortalAdmin implements OnInit {
  private router = inject(Router);
  private auth   = inject(AuthService);
  private adminService = inject(AdminService);

  nombreAdmin = this.auth.getNombre() ?? 'Administrador';
  codigoAdmin = this.auth.getCodigo() ?? 'ADM-001';

  today = new Date().toISOString().substring(0, 10);
  seccionActiva = signal<Seccion>('dashboard');
  cargando = signal(false);
  errorCarga = signal('');

  // ── AI Analysis Signals & Methods ──
  cargandoAnalisis = signal(false);
  analisisResultado = signal<string | null>(null);

  // Advanced features signals
  alertasEfectividad = signal<any[]>([]);
  tutorScores = signal<any[]>([]);
  scoreAnalisisIA = signal<string | null>(null);

  generarAnalisisIA() {
    this.cargandoAnalisis.set(true);
    this.analisisResultado.set(null);

    this.adminService.getIaAnalisis().subscribe({
      next: (res) => {
        this.analisisResultado.set(res.resultado);
        this.cargandoAnalisis.set(false);
      },
      error: () => {
        this.analisisResultado.set('Error: No se pudo generar el reporte ejecutivo escolar con IA. Por favor, verifica tu conexión o los límites de la API Key.');
        this.cargandoAnalisis.set(false);
      }
    });
  }

  cargarAlertasYScores() {
    this.adminService.getIaAlertasEfectividad().subscribe({
      next: (data) => {
        this.alertasEfectividad.set(data);
      }
    });

    this.adminService.getIaTutorScores().subscribe({
      next: (res) => {
        this.tutorScores.set(res.scores);
        this.scoreAnalisisIA.set(res.analisis);
      }
    });
  }


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

  cargarDatos() {
    this.cargando.set(true);
    this.errorCarga.set('');

    if (this.seccionActiva() === 'dashboard') {
      this.adminService.getKpis().subscribe({
        next: (data) => { 
          this.kpis.set(data); 
          this.cargarAlertasYScores();
          this.cargando.set(false); 
        },
        error: () => { this.errorCarga.set('Error al cargar KPIs.'); this.cargando.set(false); }
      });
    } else if (this.seccionActiva() === 'estudiantes') {
      this.adminService.getEstudiantes().subscribe({
        next: (data) => { this.estudiantes.set(data); this.cargando.set(false); },
        error: () => { this.errorCarga.set('Error al cargar estudiantes.'); this.cargando.set(false); }
      });
    } else if (this.seccionActiva() === 'docentes') {
      this.adminService.getDocentes().subscribe({
        next: (data) => { this.docentes.set(data); this.cargando.set(false); },
        error: () => { this.errorCarga.set('Error al cargar docentes.'); this.cargando.set(false); }
      });
    } else if (this.seccionActiva() === 'padres') {
      this.adminService.getPadres().subscribe({
        next: (data) => { this.padres.set(data); this.cargando.set(false); },
        error: () => { this.errorCarga.set('Error al cargar apoderados.'); this.cargando.set(false); }
      });
    } else if (this.seccionActiva() === 'kanban') {
      this.adminService.getNotasKanban().subscribe({
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
    const tipo = this.modalAbierto();
    const edicion = this.modoEdicion();
    const id = this.idSeleccionado();

    this.cargando.set(true);

    if (tipo === 'estudiante') {
      const req = this.formEstudiante;
      const obs = edicion 
        ? this.adminService.actualizarEstudiante(id!, req)
        : this.adminService.crearEstudiante(req);
      obs.subscribe({ next: () => { this.cerrarModal(); this.cargarDatos(); }, error: () => { alert('Error al guardar estudiante.'); this.cargando.set(false); } });
    }
    else if (tipo === 'docente') {
      const req = this.formDocente;
      const obs = edicion 
        ? this.adminService.actualizarDocente(id!, req)
        : this.adminService.crearDocente(req);
      obs.subscribe({ next: () => { this.cerrarModal(); this.cargarDatos(); }, error: () => { alert('Error al guardar docente.'); this.cargando.set(false); } });
    }
    else if (tipo === 'padre') {
      const req = this.formPadre;
      const obs = edicion 
        ? this.adminService.actualizarPadre(id!, req)
        : this.adminService.crearPadre(req);
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
        ? this.adminService.actualizarNotaKanban(id!, req)
        : this.adminService.crearNotaKanban(req);
      obs.subscribe({ next: () => { this.cerrarModal(); this.cargarDatos(); }, error: () => { alert('Error al guardar nota.'); this.cargando.set(false); } });
    }
  }

  exportarEstudiantes(formato: 'excel' | 'pdf') {
    this.adminService.exportarEstudiantesBlob(formato).subscribe({
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
    this.cargando.set(true);

    const ruta = tipo === 'estudiante' ? `estudiantes` : tipo === 'docente' ? `docentes` : tipo === 'padre' ? `padres` : `notas-kanban`;
    this.adminService.eliminar(ruta, id).subscribe({
      next: () => { this.cargarDatos(); },
      error: () => { alert('Error al eliminar registro.'); this.cargando.set(false); }
    });
  }

  cambiarEstadoNota(nota: NotaKanban, nuevoEstado: 'pendiente' | 'en_progreso' | 'completada') {
    const notaActualizada = { ...nota, estado: nuevoEstado };
    this.adminService.actualizarNotaKanban(nota.idNota!, notaActualizada).subscribe({
      next: () => { this.cargarDatos(); },
      error: () => { alert('Error al mover la nota.'); }
    });
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }

  cambiarEstadoNotaDeComponent(event: { nota: any, nuevoEstado: 'pendiente' | 'en_progreso' | 'completada' }) {
    this.cambiarEstadoNota(event.nota, event.nuevoEstado);
  }
}

