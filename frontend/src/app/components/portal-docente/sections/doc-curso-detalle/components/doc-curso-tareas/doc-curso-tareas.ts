import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type {
  CursoDocente as Curso,
  TareaDocente as Tarea,
  NotaTarea,
  FormTarea
} from '../../../../../../shared/models/docente.models';

@Component({
  selector: 'app-doc-curso-tareas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doc-curso-tareas.html',
  styleUrl: './doc-curso-tareas.scss'
})
export class DocCursoTareas {
  @Input({ required: true }) cursoActivo!: Curso;
  @Input({ required: true }) tareas: Tarea[] = [];
  @Input({ required: true }) cargandoTareas = false;
  @Input({ required: true }) notasPorTarea = new Map<number, NotaTarea[]>();
  @Input({ required: true }) guardandoNota = new Set<number>();
  @Input({ required: true }) today = '';

  @Output() crearTarea = new EventEmitter<FormTarea>();
  @Output() eliminarTarea = new EventEmitter<number>();
  @Output() toggleEntregado = new EventEmitter<{ idNota: number, idTarea: number, entregado: boolean }>();
  @Output() guardarNotaAlumno = new EventEmitter<{ idNota: number, idTarea: number, nota: number }>();
  @Output() cargarNotasTarea = new EventEmitter<number>();

  // Estados locales encapsulados
  mostrarFormTarea = signal(false);
  formTarea = signal<FormTarea>({ semana: 1, clase: 1, numeroTarea: 1, titulo: '', descripcion: '', tipoEntregable: '', fechaEntrega: '', notaMaxima: 20, intentos: 1, url: '' });
  enviandoTarea = signal(false);
  tareasExpandidas = signal<Set<number>>(new Set());
  editandoNota = signal<Map<number, string>>(new Map());

  toggleFormTarea(show: boolean) {
    this.mostrarFormTarea.set(show);
    if (show) {
      this.formTarea.set({
        semana: 1,
        clase: 1,
        numeroTarea: (this.tareas.length > 0) ? Math.max(...this.tareas.map(t => t.numeroTarea)) + 1 : 1,
        titulo: '',
        descripcion: '',
        tipoEntregable: 'Archivo',
        fechaEntrega: this.today,
        notaMaxima: 20,
        intentos: 1,
        url: ''
      });
    }
  }

  stepperTarea(field: keyof FormTarea, delta: number) {
    this.formTarea.update(f => {
      const copy = { ...f };
      const currentVal = Number(copy[field]) || 0;
      let nextVal = currentVal + delta;
      if (field === 'semana' || field === 'clase' || field === 'numeroTarea' || field === 'intentos') {
        if (nextVal < 1) nextVal = 1;
      }
      if (field === 'notaMaxima') {
        if (nextVal < 1) nextVal = 1;
        if (nextVal > 20) nextVal = 20;
      }
      (copy as any)[field] = nextVal;
      return copy;
    });
  }

  setFormTarea(field: keyof FormTarea, val: any) {
    this.formTarea.update(f => {
      const copy = { ...f };
      (copy as any)[field] = val;
      return copy;
    });
  }

  enviarTareaForm() {
    const f = this.formTarea();
    if (!f.titulo.trim()) return;
    this.enviandoTarea.set(true);
    this.crearTarea.emit(f);
    // Reiniciar
    this.mostrarFormTarea.set(false);
    this.enviandoTarea.set(false);
  }

  toggleTarea(id: number) {
    this.tareasExpandidas.update(s => {
      const copy = new Set(s);
      if (copy.has(id)) {
        copy.delete(id);
      } else {
        copy.add(id);
        this.cargarNotasTarea.emit(id);
      }
      return copy;
    });
  }

  iniciarEditNota(idNota: number, nota: number | null) {
    this.editandoNota.update(m => {
      const copy = new Map(m);
      copy.set(idNota, nota !== null ? String(nota) : '');
      return copy;
    });
  }

  setEditNota(idNota: number, val: string) {
    this.editandoNota.update(m => {
      const copy = new Map(m);
      copy.set(idNota, val);
      return copy;
    });
  }

  cancelarEditNota(idNota: number) {
    this.editandoNota.update(m => {
      const copy = new Map(m);
      copy.delete(idNota);
      return copy;
    });
  }

  guardarNotaAlumnoForm(idNota: number, idTarea: number) {
    const valStr = this.editandoNota().get(idNota);
    if (valStr === undefined) return;
    const val = parseFloat(valStr);
    if (isNaN(val) || val < 0 || val > 20) {
      alert("La nota debe ser un número entre 0 y 20");
      return;
    }
    this.guardarNotaAlumno.emit({ idNota, idTarea, nota: val });
    this.cancelarEditNota(idNota);
  }
}
