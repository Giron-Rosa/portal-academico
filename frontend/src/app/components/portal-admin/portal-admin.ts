import { Component, inject, signal, OnInit, computed } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';

type Seccion = 'dashboard' | 'estudiantes' | 'docentes' | 'padres' | 'kanban' | 'finanzas' | 'caja' | 'configuracion';

interface ConceptoPago {
  idConcepto?: number;
  nombre: string;
  descripcion: string;
  monto: number;
  activo: boolean;
}

interface CuotaEstudiante {
  idCuota: number;
  idEstudiante: number;
  estudianteNombre: string;
  estudianteApellido: string;
  estudianteCodigo: string;
  idConcepto: number;
  conceptoNombre: string;
  monto: number;
  fechaVencimiento: string;
  pagado: boolean;
  fechaPago: string | null;
  nroTransaccion: string | null;
}

interface CategoriaCaja {
  idCategoria: number;
  nombre: string;
  tipo: 'ingreso' | 'gasto';
  descripcion: string;
  activo: boolean;
}

interface MovimientoCaja {
  idMovimiento: number;
  tipo: 'ingreso' | 'gasto';
  idCategoria: number | null;
  categoriaNombre: string | null;
  descripcion: string;
  monto: number;
  fecha: string;
  referencia: string | null;
}

interface FlujoCajaMensual {
  anio: number;
  mes: number;
  totalIngresos: number;
  totalGastos: number;
  saldo: number;
}

interface CajaKpi {
  totalIngresos: number;
  totalGastos: number;
  saldo: number;
  totalMovimientos: number;
}

interface ColegioConfig {
  idConfig: number;
  nombre: string;
  ruc: string;
  direccion: string;
  telefono: string;
  email: string;
  ciudad: string;
  distrito: string;
  nivel: string;
  director: string;
  mision: string;
  vision: string;
}

interface AnoEscolar {
  idAno: number;
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  activo: boolean;
}

interface PermisoRol {
  idPermiso: number;
  idRol: number;
  rolNombre: string;
  idModulo: number;
  moduloNombre: string;
  puedeVer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeBorrar: boolean;
}

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
  imports: [FormsModule, DecimalPipe],
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

  // Finanzas signals
  conceptos     = signal<ConceptoPago[]>([]);
  cuotas        = signal<CuotaEstudiante[]>([]);
  cargandoFinanzas = signal(false);
  filtroCuotaEstudiante = '';
  filtroCuotaPagado: 'todos' | 'pagados' | 'pendientes' = 'todos';
  modalFinanzas = signal<'concepto' | 'generar' | 'pagar' | null>(null);

  cuotasMorosas = computed(() => this.cuotas().filter(c => !c.pagado));
  cuotasPagadas = computed(() => this.cuotas().filter(c => c.pagado));

  formConcepto = { idConcepto: null as number | null, nombre: '', descripcion: '', monto: 0, activo: true };
  formGenerar  = { idConcepto: null as number | null, grado: '', fechaVencimiento: '' };
  formPagar    = { idCuota: null as number | null, nroTransaccion: '' };

  // Caja signals
  private readonly CAJA = 'http://localhost:8080/api/portal/admin/caja';
  categoriasIngreso = signal<CategoriaCaja[]>([]);
  categoriasGasto   = signal<CategoriaCaja[]>([]);
  movimientosCaja   = signal<MovimientoCaja[]>([]);
  flujoCaja         = signal<FlujoCajaMensual[]>([]);
  cajaKpi           = signal<CajaKpi | null>(null);
  cargandoCaja      = signal(false);
  filtroMovTipo: 'todos' | 'ingreso' | 'gasto' = 'todos';
  filtroMovAnio: number = new Date().getFullYear();
  filtroMovMes: number | null = null;
  modalCaja = signal<'movimiento' | null>(null);
  formMovimiento = { tipo: 'gasto' as 'ingreso'|'gasto', idCategoria: null as number|null, descripcion: '', monto: 0, fecha: this.today, referencia: '' };

  // Config signals
  private readonly CONFIG_URL = 'http://localhost:8080/api/portal/admin/config';
  colegioConfig = signal<ColegioConfig | null>(null);
  anosEscolares = signal<AnoEscolar[]>([]);
  permisos      = signal<PermisoRol[]>([]);
  cargandoConfig = signal(false);
  formColegio: Partial<ColegioConfig> = {};
  formAnoEscolar = { nombre: '', fechaInicio: '', fechaFin: '' };
  editandoColegio = false;

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
    if (sec === 'finanzas')      this.cargarFinanzas();
    if (sec === 'caja')          this.cargarCaja();
    if (sec === 'configuracion') this.cargarConfiguracion();
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
    } else if (this.seccionActiva() === 'finanzas') {
      this.cargarFinanzas();
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

  // ── Finanzas Methods ──────────────────────────────────────────────
  private readonly FIN = 'http://localhost:8080/api/portal/admin/finanzas';

  cargarFinanzas() {
    const h = this.getHeaders();
    this.cargandoFinanzas.set(true);
    const q   = this.filtroCuotaEstudiante.trim();
    const pag = this.filtroCuotaPagado;
    let params = q ? `?query=${encodeURIComponent(q)}` : '';
    if (pag !== 'todos') params += (params ? '&' : '?') + `pagado=${pag === 'pagados'}`;

    this.http.get<ConceptoPago[]>(`${this.FIN}/conceptos`, { headers: h }).subscribe({
      next: d => this.conceptos.set(d),
      error: () => {}
    });
    this.http.get<CuotaEstudiante[]>(`${this.FIN}/cuotas${params}`, { headers: h }).subscribe({
      next: d => { this.cuotas.set(d); this.cargandoFinanzas.set(false); },
      error: () => this.cargandoFinanzas.set(false)
    });
  }

  abrirConceptoNuevo() {
    this.formConcepto = { idConcepto: null, nombre: '', descripcion: '', monto: 0, activo: true };
    this.modalFinanzas.set('concepto');
  }
  abrirConceptoEditar(c: ConceptoPago) {
    this.formConcepto = { idConcepto: c.idConcepto!, nombre: c.nombre, descripcion: c.descripcion, monto: c.monto, activo: c.activo };
    this.modalFinanzas.set('concepto');
  }
  guardarConcepto() {
    const h   = this.getHeaders();
    const f   = this.formConcepto;
    const obs = f.idConcepto
      ? this.http.put(`${this.FIN}/conceptos/${f.idConcepto}`, f, { headers: h })
      : this.http.post(`${this.FIN}/conceptos`, f, { headers: h });
    obs.subscribe({ next: () => { this.modalFinanzas.set(null); this.cargarFinanzas(); }, error: () => alert('Error al guardar concepto.') });
  }
  eliminarConcepto(c: ConceptoPago) {
    if (!confirm(`¿Eliminar concepto "${c.nombre}"?`)) return;
    this.http.delete(`${this.FIN}/conceptos/${c.idConcepto}`, { headers: this.getHeaders() }).subscribe({
      next: () => this.cargarFinanzas(),
      error: () => alert('Error al eliminar concepto.')
    });
  }
  abrirGenerarCuotas() {
    this.formGenerar = { idConcepto: null, grado: '', fechaVencimiento: this.today };
    this.modalFinanzas.set('generar');
  }
  procesarGenerarCuotas() {
    const h = this.getHeaders();
    this.http.post(`${this.FIN}/cuotas/generar`, this.formGenerar, { headers: h }).subscribe({
      next: () => { this.modalFinanzas.set(null); this.cargarFinanzas(); },
      error: () => alert('Error al generar cuotas.')
    });
  }
  abrirRegistrarPago(q: CuotaEstudiante) {
    this.formPagar = { idCuota: q.idCuota, nroTransaccion: '' };
    this.modalFinanzas.set('pagar');
  }
  procesarRegistrarPago() {
    const h = this.getHeaders();
    const id = this.formPagar.idCuota;
    this.http.post(`${this.FIN}/cuotas/${id}/pagar`, { nroTransaccion: this.formPagar.nroTransaccion }, { headers: h }).subscribe({
      next: () => { this.modalFinanzas.set(null); this.cargarFinanzas(); },
      error: () => alert('Error al registrar el pago.')
    });
  }

  // ── Caja Methods ──────────────────────────────────────────────────

  readonly MESES = ['', 'Enero','Febrero','Marzo','Abril','Mayo','Junio',
                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  cargarCaja() {
    const h = this.getHeaders();
    this.cargandoCaja.set(true);
    const tipo = this.filtroMovTipo !== 'todos' ? this.filtroMovTipo : '';
    let qs = `?anio=${this.filtroMovAnio}`;
    if (tipo)              qs += `&tipo=${tipo}`;
    if (this.filtroMovMes) qs += `&mes=${this.filtroMovMes}`;

    this.http.get<CategoriaCaja[]>(`${this.CAJA}/categorias?tipo=ingreso`, { headers: h }).subscribe({ next: d => this.categoriasIngreso.set(d), error: () => {} });
    this.http.get<CategoriaCaja[]>(`${this.CAJA}/categorias?tipo=gasto`,   { headers: h }).subscribe({ next: d => this.categoriasGasto.set(d),   error: () => {} });
    this.http.get<any>(`${this.CAJA}/kpi?anio=${this.filtroMovAnio}`,      { headers: h }).subscribe({ next: d => this.cajaKpi.set(d),           error: () => {} });
    this.http.get<FlujoCajaMensual[]>(`${this.CAJA}/flujo?anio=${this.filtroMovAnio}`, { headers: h }).subscribe({ next: d => this.flujoCaja.set(d), error: () => {} });
    this.http.get<MovimientoCaja[]>(`${this.CAJA}/movimientos${qs}`, { headers: h }).subscribe({
      next: d => { this.movimientosCaja.set(d); this.cargandoCaja.set(false); },
      error: () => this.cargandoCaja.set(false)
    });
  }

  abrirNuevoMovimiento() {
    this.formMovimiento = { tipo: 'gasto', idCategoria: null, descripcion: '', monto: 0, fecha: this.today, referencia: '' };
    this.modalCaja.set('movimiento');
  }
  guardarMovimiento() {
    const h = this.getHeaders();
    this.http.post<MovimientoCaja>(`${this.CAJA}/movimientos`, this.formMovimiento, { headers: h }).subscribe({
      next: () => { this.modalCaja.set(null); this.cargarCaja(); },
      error: () => alert('Error al guardar el movimiento.')
    });
  }
  eliminarMovimiento(m: MovimientoCaja) {
    if (!confirm(`¿Eliminar movimiento "${m.descripcion}"?`)) return;
    this.http.delete(`${this.CAJA}/movimientos/${m.idMovimiento}`, { headers: this.getHeaders() }).subscribe({
      next: () => this.cargarCaja(),
      error: () => alert('Error al eliminar el movimiento.')
    });
  }

  getNombreMes(mes: number): string { return this.MESES[mes] ?? mes.toString(); }


  // ── Configuración Methods ─────────────────────────────────────────

  cargarConfiguracion() {
    const h = this.getHeaders();
    this.cargandoConfig.set(true);
    this.http.get<ColegioConfig>(`${this.CONFIG_URL}/colegio`, { headers: h }).subscribe({
      next: d => { this.colegioConfig.set(d); this.formColegio = { ...d }; this.editandoColegio = false; },
      error: () => {}
    });
    this.http.get<AnoEscolar[]>(`${this.CONFIG_URL}/anos`, { headers: h }).subscribe({
      next: d => this.anosEscolares.set(d),
      error: () => {}
    });
    this.http.get<PermisoRol[]>(`${this.CONFIG_URL}/permisos`, { headers: h }).subscribe({
      next: d => { this.permisos.set(d); this.cargandoConfig.set(false); },
      error: () => this.cargandoConfig.set(false)
    });
  }

  guardarColegio() {
    const h = this.getHeaders();
    this.http.put<ColegioConfig>(`${this.CONFIG_URL}/colegio`, this.formColegio, { headers: h }).subscribe({
      next: d => { this.colegioConfig.set(d); this.editandoColegio = false; alert('Datos del colegio actualizados.'); },
      error: () => alert('Error al guardar los datos del colegio.')
    });
  }

  crearAnoEscolar() {
    const h = this.getHeaders();
    this.http.post<AnoEscolar>(`${this.CONFIG_URL}/anos`, this.formAnoEscolar, { headers: h }).subscribe({
      next: () => { this.formAnoEscolar = { nombre: '', fechaInicio: '', fechaFin: '' }; this.cargarConfiguracion(); },
      error: () => alert('Error al crear el año escolar.')
    });
  }

  activarAno(a: AnoEscolar) {
    if (!confirm(`¿Activar "${a.nombre}" como año escolar en curso?`)) return;
    this.http.put(`${this.CONFIG_URL}/anos/${a.idAno}/activar`, {}, { headers: this.getHeaders() }).subscribe({
      next: () => this.cargarConfiguracion(),
      error: () => alert('Error al activar el año escolar.')
    });
  }

  getRolesUnicos(): string[] {
    return [...new Set(this.permisos().map(p => p.rolNombre))];
  }

  getPermisosPorRol(rol: string): PermisoRol[] {
    return this.permisos().filter(p => p.rolNombre === rol);
  }

  togglePermiso(p: PermisoRol, campo: 'puedeVer' | 'puedeCrear' | 'puedeEditar' | 'puedeBorrar') {
    const actualizado = { ...p, [campo]: !p[campo] };
    this.http.put<PermisoRol>(`${this.CONFIG_URL}/permisos/${p.idPermiso}`, {
      puedeVer: actualizado.puedeVer, puedeCrear: actualizado.puedeCrear,
      puedeEditar: actualizado.puedeEditar, puedeBorrar: actualizado.puedeBorrar
    }, { headers: this.getHeaders() }).subscribe({
      next: updated => {
        this.permisos.update(list => list.map(x => x.idPermiso === updated.idPermiso ? updated : x));
      },
      error: () => alert('Error al actualizar el permiso.')
    });
  }

  getPermisoValor(p: PermisoRol, campo: string): boolean {
    if (campo === 'puedeVer')    return p.puedeVer;
    if (campo === 'puedeCrear')  return p.puedeCrear;
    if (campo === 'puedeEditar') return p.puedeEditar;
    if (campo === 'puedeBorrar') return p.puedeBorrar;
    return false;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }

}


