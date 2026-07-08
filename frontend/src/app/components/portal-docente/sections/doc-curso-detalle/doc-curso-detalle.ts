import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type {
  CursoDocente as Curso,
  UnidadDocente as Unidad,
  MaterialDocente as Material,
  SemanaNodoDocente as SemanaNodo,
  TareaDocente as Tarea,
  NotaTarea,
  ExamenDocente as Examen,
  NotaExamen,
  AlumnoReportes,
  AsistenciaAlumnoDocente as AsistenciaAlumno,
  ConsolidadoMensual,
  FormUnidad,
  FormMaterial,
  FormTarea,
  FormExamen,
  FormReporte,
  ReporteDocente as Reporte
} from '../../../../shared/models/docente.models';

@Component({
  selector: 'app-doc-curso-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doc-curso-detalle.html',
  styleUrl: './doc-curso-detalle.scss'
})
export class DocCursoDetalle {
  @Input({ required: true }) cursoActivo!: Curso;
  @Input({ required: true }) unidades: Unidad[] = [];
  @Input({ required: true }) cargandoTemario = false;
  @Input({ required: true }) materiales: Material[] = [];
  @Input({ required: true }) cargandoMat = false;
  @Input({ required: true }) contenidoArbol: SemanaNodo[] = [];
  @Input({ required: true }) tareas: Tarea[] = [];
  @Input({ required: true }) cargandoTareas = false;
  @Input({ required: true }) notasPorTarea = new Map<number, NotaTarea[]>();
  @Input({ required: true }) guardandoNota = new Set<number>();
  @Input({ required: true }) examenes: Examen[] = [];
  @Input({ required: true }) cargandoExamenes = false;
  @Input({ required: true }) notasPorExamen = new Map<number, NotaExamen[]>();
  @Input({ required: true }) guardandoNotaEx = new Set<number>();
  @Input({ required: true }) reportesAlumnos: AlumnoReportes[] = [];
  @Input({ required: true }) cargandoReportes = false;
  @Input({ required: true }) fechaAsistencia = '';
  @Input({ required: true }) fechasSesiones: string[] = [];
  @Input({ required: true }) asistenciaLocal: AsistenciaAlumno[] = [];
  @Input({ required: true }) cargandoAsistencia = false;
  @Input({ required: true }) guardandoAsistencia = false;
  @Input({ required: true }) asistenciaModificada = false;
  @Input({ required: true }) asistenciaStats!: { presentes: number, faltas: number, tardanzas: number, justificados: number };
  @Input({ required: true }) mostrarConsolidado = false;
  @Input({ required: true }) mesConsolidado = '';
  @Input({ required: true }) cargandoConsolidado = false;
  @Input({ required: true }) datosConsolidado: ConsolidadoMensual | null = null;
  @Input({ required: true }) clasesDeHoy: Curso[] = [];
  @Input({ required: true }) today = '';

  // Operaciones de negocio al padre
  @Output() volverAlInicio = new EventEmitter<void>();
  @Output() crearMaterial = new EventEmitter<FormMaterial>();
  @Output() eliminarMaterial = new EventEmitter<number>();
  @Output() crearTarea = new EventEmitter<FormTarea>();
  @Output() eliminarTarea = new EventEmitter<number>();
  @Output() crearExamen = new EventEmitter<FormExamen>();
  @Output() eliminarExamen = new EventEmitter<number>();
  @Output() crearUnidad = new EventEmitter<FormUnidad>();
  @Output() actualizarEstadoUnidad = new EventEmitter<{ unidad: Unidad, estado: 'pendiente' | 'en_curso' | 'concluido' }>();
  @Output() crearReporte = new EventEmitter<FormReporte>();
  @Output() eliminarReporte = new EventEmitter<{ idReporte: number, idAlumno: number }>();
  @Output() toggleVisibilidadReporte = new EventEmitter<{ idReporte: number, idAlumno: number }>();
  @Output() toggleEntregado = new EventEmitter<{ idNota: number, idTarea: number, entregado: boolean }>();
  @Output() toggleAsistio = new EventEmitter<{ idNotaExamen: number, idExamen: number, asistio: boolean }>();
  @Output() guardarNotaAlumno = new EventEmitter<{ idNota: number, idTarea: number, nota: number }>();
  @Output() guardarNotaExamen = new EventEmitter<{ idNotaExamen: number, idExamen: number, nota: number }>();
  @Output() cambiarFechaAsistencia = new EventEmitter<string>();
  @Output() guardarAsistencia = new EventEmitter<void>();
  @Output() marcarTodosPresentes = new EventEmitter<void>();
  @Output() setEstadoAsistencia = new EventEmitter<{ idAlumno: number, estado: string }>();
  @Output() setJustificanteAsistencia = new EventEmitter<{ idAlumno: number, justificante: string }>();
  @Output() verConsolidado = new EventEmitter<void>();
  @Output() cambiarMesConsolidado = new EventEmitter<number>();
  @Output() exportarCurso = new EventEmitter<'pdf' | 'excel'>();

  // Cargas secundarias bajo demanda
  @Output() cargarNotasTarea = new EventEmitter<number>();
  @Output() cargarNotasExamen = new EventEmitter<number>();

  // ─── Variables de navegación interna y modales ───
  activeSubTab = signal<'temario' | 'contenido' | 'asistencia' | 'tareas' | 'examenes' | 'reportes'>('temario');
  courseTabs: { id: 'temario' | 'contenido' | 'asistencia' | 'tareas' | 'examenes' | 'reportes', label: string }[] = [
    { id: 'temario',    label: 'Temario'    },
    { id: 'contenido',  label: 'Contenido'  },
    { id: 'asistencia', label: 'Asistencia' },
    { id: 'tareas',     label: 'Tareas'     },
    { id: 'examenes',   label: 'Exámenes'   },
    { id: 'reportes',   label: 'Reportes'   },
  ];

  // Acordeones abiertos
  unidadesAbiertas = signal<Set<number>>(new Set([1]));
  semanasAbiertas = signal<Set<number>>(new Set([1]));
  clasesAbiertas = signal<Set<string>>(new Set(['1-1']));
  tareasExpandidas = signal<Set<number>>(new Set());
  examenesExpandidos = signal<Set<number>>(new Set());
  alumnosExpandidos = signal<Set<number>>(new Set());

  // Visibilidad de formularios de creación
  mostrarFormUnidad = signal(false);
  mostrarFormTarea = signal(false);
  mostrarFormExamen = signal(false);
  mostrarFormReporte = signal(false);
  modalMaterial = signal(false);

  // Formularios locales
  formUnidad = signal<FormUnidad>({ numero: 1, titulo: '', bimestre: 'Bimestre I', semanas: '', objetivos: '', indicadores: '', contenidos: '', estado: 'pendiente' });
  formMaterial = signal<FormMaterial>({ semana: 1, clase: 1, titulo: '', tipo: 'pdf', url: '' });
  formTarea = signal<FormTarea>({ semana: 1, clase: 1, numeroTarea: 1, titulo: '', descripcion: '', tipoEntregable: '', fechaEntrega: '', notaMaxima: 20, intentos: 1, url: '' });
  formExamen = signal<FormExamen>({ semana: 1, clase: 1, numeroExamen: 1, titulo: '', descripcion: '', tipo: 'escrito', fechaExamen: '', duracionMinutos: 90, notaMaxima: 20, url: '' });
  formReporte = signal<FormReporte>({ idAlumno: null, tipo: 'anotacion', titulo: '', descripcion: '', fecha: '', visiblePadre: false });

  // Envío cargando local (para deshabilitar botones de envío en modales)
  enviandoMat = signal(false);
  enviandoTarea = signal(false);
  enviandoExamen = signal(false);
  enviandoReporte = signal(false);

  // Estados de edición inline de notas
  editandoNota = signal<Map<number, string>>(new Map());
  editandoNotaEx = signal<Map<number, string>>(new Map());

  // ─── Computed del temario ───
  progresoTemario = computed(() => {
    const list = this.unidades;
    const total = list.length;
    if (total === 0) return { concluido: 0, enCurso: 0, pendiente: 100, totalPct: 0 };
    const concluidas = list.filter(u => u.estado === 'concluido').length;
    const enCurso = list.filter(u => u.estado === 'en_curso').length;

    const pctConcluido = (concluidas / total) * 100;
    const pctEnCurso = (enCurso * 0.5 / total) * 100;
    const pctPendiente = 100 - pctConcluido - pctEnCurso;

    return {
      concluido: Math.round(pctConcluido),
      enCurso: Math.round(pctEnCurso),
      pendiente: Math.round(pctPendiente),
      totalPct: Math.round((concluidas + enCurso * 0.5) / total * 100)
    };
  });

  // ─── Métodos de interacción interna ───

  toggleUnidad(numero: number) {
    this.unidadesAbiertas.update(s => {
      const n = new Set(s);
      n.has(numero) ? n.delete(numero) : n.add(numero);
      return n;
    });
  }

  toggleSemana(semana: number) {
    this.semanasAbiertas.update(s => {
      const n = new Set(s);
      n.has(semana) ? n.delete(semana) : n.add(semana);
      return n;
    });
  }

  toggleClase(semana: number, clase: number) {
    const key = `${semana}-${clase}`;
    this.clasesAbiertas.update(s => {
      const n = new Set(s);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });
  }

  toggleTarea(id: number) {
    this.tareasExpandidas.update(s => {
      const n = new Set(s);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
        if (!this.notasPorTarea.has(id)) {
          this.cargarNotasTarea.emit(id);
        }
      }
      return n;
    });
  }

  toggleExamen(id: number) {
    this.examenesExpandidos.update(s => {
      const n = new Set(s);
      if (n.has(id)) {
        n.delete(id);
      } else {
        n.add(id);
        if (!this.notasPorExamen.has(id)) {
          this.cargarNotasExamen.emit(id);
        }
      }
      return n;
    });
  }

  toggleAlumnoReportes(idAlumno: number) {
    this.alumnosExpandidos.update(s => {
      const n = new Set(s);
      n.has(idAlumno) ? n.delete(idAlumno) : n.add(idAlumno);
      return n;
    });
  }

  // ─── Helpers de formato y colores ───

  colorMaterial(tipo: string): string {
    return ({ pdf: '#ef4444', word: '#3b82f6', video: '#8b5cf6', url: '#10b981', youtube: '#ef4444' } as Record<string, string>)[tipo] ?? '#6b7280';
  }

  labelMaterial(tipo: string): string {
    return ({ pdf: 'Material · pdf', word: 'Material · word', video: 'Material · video', url: 'Enlace · url', youtube: 'YouTube · video' } as Record<string, string>)[tipo] ?? tipo;
  }

  labelTipoExamen(tipo: string): string {
    return ({ escrito: 'Escrito', oral: 'Oral', online: 'Online', practico: 'Práctico' } as Record<string, string>)[tipo] ?? tipo;
  }

  tipoReporteInfo(tipo: string): { label: string, css: string } {
    const map: Record<string, { label: string, css: string }> = {
      anotacion:        { label: 'Anotación',           css: 'rp-badge-anotacion' },
      pendiente:        { label: 'Pendiente',           css: 'rp-badge-pendiente' },
      llamada_atencion: { label: 'Llamada de Atención', css: 'rp-badge-atencion'  },
      felicitacion:     { label: 'Felicitación',        css: 'rp-badge-felicitacion' },
      otro:             { label: 'Otro',                css: 'rp-badge-otro' }
    };
    return map[tipo] ?? map['otro'];
  }

  contarTipoReporte(reportes: Reporte[], tipo: string): number {
    return reportes.filter(r => r.tipo === tipo).length;
  }

  formatFechaCorta(fechaStr: string): string {
    if (!fechaStr) return '';
    const [y, m, d] = fechaStr.split('-');
    return `${d}/${m}`;
  }

  formatFechaLarga(fechaStr: string): string {
    if (!fechaStr) return '';
    const [y, m, d] = fechaStr.split('-');
    return `${d}/${m}/${y}`;
  }

  formatMes(mesStr: string): string {
    if (!mesStr) return '';
    const [y, m] = mesStr.split('-');
    const nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    return `${nombres[parseInt(m) - 1]} ${y}`;
  }

  // ─── Modales Toggles y Steppers ───

  abrirNuevaUnidad() {
    const nextNum = this.unidades.length + 1;
    this.formUnidad.set({ numero: nextNum, titulo: '', bimestre: 'Bimestre I', semanas: '', objetivos: '', indicadores: '', contenidos: '', estado: 'pendiente' });
    this.mostrarFormUnidad.set(true);
  }

  editarUnidad(u: Unidad) {
    this.formUnidad.set({
      idUnidad: u.idUnidad,
      numero: u.numero,
      titulo: u.titulo,
      bimestre: u.bimestre,
      semanas: u.semanas,
      objetivos: u.objetivos.join('\n'),
      indicadores: u.indicadores.join('\n'),
      contenidos: u.contenidos.join('\n'),
      estado: u.estado
    });
    this.mostrarFormUnidad.set(true);
  }

  guardarUnidad() {
    this.crearUnidad.emit(this.formUnidad());
    this.mostrarFormUnidad.set(false);
  }

  toggleModalMaterial(abrir: boolean) {
    if (abrir) {
      this.formMaterial.set({ semana: 1, clase: 1, titulo: '', tipo: 'pdf', url: '' });
      this.enviandoMat.set(false);
    }
    this.modalMaterial.set(abrir);
  }

  stepperMat(campo: 'semana' | 'clase', delta: number) {
    this.formMaterial.update(f => ({ ...f, [campo]: Math.max(1, f[campo] + delta) }));
  }

  setFormMat(campo: keyof FormMaterial, valor: string | number) {
    this.formMaterial.update(f => ({ ...f, [campo]: valor }));
  }

  enviarMaterialForm() {
    this.enviandoMat.set(true);
    this.crearMaterial.emit(this.formMaterial());
    // Se asume que el padre recargará y cerrará el modal
  }

  toggleFormTarea(abrir: boolean) {
    if (abrir) {
      const nextNum = this.tareas.length + 1;
      this.formTarea.set({
        semana: 1, clase: 1, numeroTarea: nextNum,
        titulo: '', descripcion: '', tipoEntregable: '',
        fechaEntrega: '', notaMaxima: 20, intentos: 1, url: ''
      });
      this.enviandoTarea.set(false);
    }
    this.mostrarFormTarea.set(abrir);
  }

  stepperTarea(campo: 'semana' | 'clase' | 'numeroTarea' | 'notaMaxima' | 'intentos', delta: number) {
    this.formTarea.update(f => ({ ...f, [campo]: Math.max(1, f[campo] + delta) }));
  }

  setFormTarea(campo: keyof FormTarea, valor: string | number) {
    this.formTarea.update(f => ({ ...f, [campo]: valor }));
  }

  enviarTareaForm() {
    this.enviandoTarea.set(true);
    this.crearTarea.emit(this.formTarea());
  }

  toggleFormExamen(abrir: boolean) {
    if (abrir) {
      const nextNum = this.examenes.length + 1;
      this.formExamen.set({
        semana: 1, clase: 1, numeroExamen: nextNum,
        titulo: '', descripcion: '', tipo: 'escrito',
        fechaExamen: '', duracionMinutos: 90, notaMaxima: 20, url: ''
      });
      this.enviandoExamen.set(false);
    }
    this.mostrarFormExamen.set(abrir);
  }

  stepperExamen(campo: 'semana' | 'clase' | 'numeroExamen' | 'notaMaxima' | 'duracionMinutos', delta: number) {
    this.formExamen.update(f => ({ ...f, [campo]: Math.max(1, f[campo] + delta) }));
  }

  setFormExamen(campo: keyof FormExamen, valor: string | number) {
    this.formExamen.update(f => ({ ...f, [campo]: valor }));
  }

  enviarExamenForm() {
    this.enviandoExamen.set(true);
    this.crearExamen.emit(this.formExamen());
  }

  toggleFormReporte(abrir: boolean) {
    if (abrir) {
      this.formReporte.update(f => ({
        ...f,
        tipo: 'anotacion', titulo: '', descripcion: '',
        fecha: this.today, visiblePadre: false
      }));
      this.enviandoReporte.set(false);
    }
    this.mostrarFormReporte.set(abrir);
  }

  setFormReporte(campo: keyof FormReporte, valor: any) {
    this.formReporte.update(f => ({ ...f, [campo]: valor }));
  }

  enviarReporteForm() {
    this.enviandoReporte.set(true);
    this.crearReporte.emit(this.formReporte());
  }

  // ─── Edición inline de Notas ───

  iniciarEditNota(idNota: number, notaActual: number | null) {
    this.editandoNota.update(m => new Map(m).set(idNota, notaActual?.toString() ?? ''));
  }

  cancelarEditNota(idNota: number) {
    this.editandoNota.update(m => { const n = new Map(m); n.delete(idNota); return n; });
  }

  setEditNota(idNota: number, valor: string) {
    this.editandoNota.update(m => new Map(m).set(idNota, valor));
  }

  guardarNotaAlumnoForm(idNota: number, idTarea: number) {
    const val = parseFloat(this.editandoNota().get(idNota) ?? '');
    if (isNaN(val)) return;
    this.guardarNotaAlumno.emit({ idNota, idTarea, nota: val });
    this.cancelarEditNota(idNota);
  }

  iniciarEditNotaEx(idNotaEx: number, notaActual: number | null) {
    this.editandoNotaEx.update(m => new Map(m).set(idNotaEx, notaActual?.toString() ?? ''));
  }

  cancelarEditNotaEx(idNotaEx: number) {
    this.editandoNotaEx.update(m => { const n = new Map(m); n.delete(idNotaEx); return n; });
  }

  setEditNotaEx(idNotaEx: number, valor: string) {
    this.editandoNotaEx.update(m => new Map(m).set(idNotaEx, valor));
  }

  guardarNotaExamenForm(idNotaExamen: number, idExamen: number) {
    const val = parseFloat(this.editandoNotaEx().get(idNotaExamen) ?? '');
    if (isNaN(val)) return;
    this.guardarNotaExamen.emit({ idNotaExamen, idExamen, nota: val });
    this.cancelarEditNotaEx(idNotaExamen);
  }
}
