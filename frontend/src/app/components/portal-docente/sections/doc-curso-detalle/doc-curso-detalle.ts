import { Component, Input, Output, EventEmitter, signal, computed, inject, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
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

import { DocCursoAsistencia } from './components/doc-curso-asistencia/doc-curso-asistencia';
import { DocCursoTareas } from './components/doc-curso-tareas/doc-curso-tareas';
import { DocCursoExamenes } from './components/doc-curso-examenes/doc-curso-examenes';
import { DocCursoReportes } from './components/doc-curso-reportes/doc-curso-reportes';

@Component({
  selector: 'app-doc-curso-detalle',
  standalone: true,
  imports: [CommonModule, FormsModule, DocCursoAsistencia, DocCursoTareas, DocCursoExamenes, DocCursoReportes],
  templateUrl: './doc-curso-detalle.html',
  styleUrl: './doc-curso-detalle.scss'
})
export class DocCursoDetalle implements OnChanges {
  private sanitizer = inject(DomSanitizer);

  // ── Previsualización de Materiales ─────────────────────────────────
  materialSeleccionadoParaVer = signal<Material | null>(null);
  safeUrl = computed(() => {
    const mat = this.materialSeleccionadoParaVer();
    if (!mat || !mat.url) return null;
    let url = mat.url;
    if (mat.tipo === 'youtube' && url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1]?.split('&')[0];
      if (videoId) {
        url = `https://www.youtube.com/embed/${videoId}`;
      }
    }
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  });

  // ── Drag and Drop de archivos ──────────────────────────────────────
  isDragging = signal(false);
  selectedFile = signal<File | null>(null);

  @Input({ required: true }) cursoActivo!: Curso;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['materiales']) {
      this.modalMaterial.set(false);
      this.enviandoMat.set(false);
      this.selectedFile.set(null);
      this.isDragging.set(false);
    }
  }

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

  // Visibilidad de formularios de creación
  mostrarFormUnidad = signal(false);
  modalMaterial = signal(false);

  // Formularios locales
  formUnidad = signal<FormUnidad>({ numero: 1, titulo: '', bimestre: 'Bimestre I', semanas: '', objetivos: '', indicadores: '', contenidos: '', estado: 'pendiente' });
  formMaterial = signal<FormMaterial>({ semana: 1, clase: 1, titulo: '', tipo: 'pdf', url: '', file: null });

  // Envío cargando local (para deshabilitar botones de envío en modales)
  enviandoMat = signal(false);

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

  // ─── Helpers de formato y colores ───

  colorMaterial(tipo: string): string {
    return ({ pdf: '#ef4444', word: '#3b82f6', video: '#8b5cf6', url: '#10b981', youtube: '#ef4444' } as Record<string, string>)[tipo] ?? '#6b7280';
  }

  labelMaterial(tipo: string): string {
    return ({ pdf: 'Material · pdf', word: 'Material · word', video: 'Material · video', url: 'Enlace · url', youtube: 'YouTube · video' } as Record<string, string>)[tipo] ?? tipo;
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
      this.formMaterial.set({ semana: 1, clase: 1, titulo: '', tipo: 'pdf', url: '', file: null });
      this.enviandoMat.set(false);
      this.selectedFile.set(null);
      this.isDragging.set(false);
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
  }

  abrirMaterial(mat: Material) {
    this.materialSeleccionadoParaVer.set(mat);
  }

  cerrarMaterial() {
    this.materialSeleccionadoParaVer.set(null);
  }

  tipoIcon(tipo: string): string {
    const icons: Record<string, string> = {
      pdf: '📄', word: '📝', url: '🔗', video: '🎬', youtube: '▶️',
    };
    return icons[tipo] ?? '📎';
  }

  // ── Eventos Drag and Drop / Selección ──────────────────────────────
  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
  }

  onFileDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging.set(false);
    
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      this.handleFile(file);
    }
  }

  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      const file = target.files[0];
      this.handleFile(file);
    }
  }

  private handleFile(file: File) {
    this.selectedFile.set(file);
    const currentForm = this.formMaterial();
    if (!currentForm.titulo.trim()) {
      const titleWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const cleanTitle = titleWithoutExt.replace(/[-_]/g, ' ');
      this.setFormMat('titulo', cleanTitle);
    }
    
    this.formMaterial.update(f => ({
      ...f,
      file: file,
    }));
  }
}
