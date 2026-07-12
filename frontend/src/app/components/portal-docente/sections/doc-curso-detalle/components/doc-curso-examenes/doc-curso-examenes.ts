import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type {
  CursoDocente as Curso,
  ExamenDocente as Examen,
  NotaExamen,
  FormExamen
} from '../../../../../../shared/models/docente.models';

@Component({
  selector: 'app-doc-curso-examenes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doc-curso-examenes.html',
  styleUrl: './doc-curso-examenes.scss'
})
export class DocCursoExamenes {
  @Input({ required: true }) cursoActivo!: Curso;
  @Input({ required: true }) examenes: Examen[] = [];
  @Input({ required: true }) cargandoExamenes = false;
  @Input({ required: true }) notasPorExamen = new Map<number, NotaExamen[]>();
  @Input({ required: true }) guardandoNotaEx = new Set<number>();
  @Input({ required: true }) today = '';

  @Output() crearExamen = new EventEmitter<FormExamen>();
  @Output() eliminarExamen = new EventEmitter<number>();
  @Output() toggleAsistio = new EventEmitter<{ idNotaExamen: number, idExamen: number, asistio: boolean }>();
  @Output() guardarNotaExamen = new EventEmitter<{ idNotaExamen: number, idExamen: number, nota: number }>();
  @Output() cargarNotasExamen = new EventEmitter<number>();

  // Estados locales encapsulados
  mostrarFormExamen = signal(false);
  formExamen = signal<FormExamen>({ semana: 1, clase: 1, numeroExamen: 1, titulo: '', descripcion: '', tipo: 'escrito', fechaExamen: '', duracionMinutos: 90, notaMaxima: 20, url: '' });
  enviandoExamen = signal(false);
  examenesExpandidos = signal<Set<number>>(new Set());
  editandoNotaEx = signal<Map<number, string>>(new Map());

  toggleFormExamen(show: boolean) {
    this.mostrarFormExamen.set(show);
    if (show) {
      this.formExamen.set({
        semana: 1,
        clase: 1,
        numeroExamen: (this.examenes.length > 0) ? Math.max(...this.examenes.map(e => e.numeroExamen)) + 1 : 1,
        titulo: '',
        descripcion: '',
        tipo: 'escrito',
        fechaExamen: this.today,
        duracionMinutos: 90,
        notaMaxima: 20,
        url: ''
      });
    }
  }

  stepperExamen(field: keyof FormExamen, delta: number) {
    this.formExamen.update(f => {
      const copy = { ...f };
      const currentVal = Number(copy[field]) || 0;
      let nextVal = currentVal + delta;
      if (field === 'semana' || field === 'clase' || field === 'numeroExamen' || field === 'duracionMinutos') {
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

  setFormExamen(field: keyof FormExamen, val: any) {
    this.formExamen.update(f => {
      const copy = { ...f };
      (copy as any)[field] = val;
      return copy;
    });
  }

  enviarExamenForm() {
    const f = this.formExamen();
    if (!f.titulo.trim()) return;
    this.enviandoExamen.set(true);
    this.crearExamen.emit(f);
    // Reiniciar
    this.mostrarFormExamen.set(false);
    this.enviandoExamen.set(false);
  }

  toggleExamen(id: number) {
    this.examenesExpandidos.update(s => {
      const copy = new Set(s);
      if (copy.has(id)) {
        copy.delete(id);
      } else {
        copy.add(id);
        this.cargarNotasExamen.emit(id);
      }
      return copy;
    });
  }

  iniciarEditNotaEx(idNotaExamen: number, nota: number | null) {
    this.editandoNotaEx.update(m => {
      const copy = new Map(m);
      copy.set(idNotaExamen, nota !== null ? String(nota) : '');
      return copy;
    });
  }

  setEditNotaEx(idNotaExamen: number, val: string) {
    this.editandoNotaEx.update(m => {
      const copy = new Map(m);
      copy.set(idNotaExamen, val);
      return copy;
    });
  }

  cancelarEditNotaEx(idNotaExamen: number) {
    this.editandoNotaEx.update(m => {
      const copy = new Map(m);
      copy.delete(idNotaExamen);
      return copy;
    });
  }

  guardarNotaExamenForm(idNotaExamen: number, idExamen: number) {
    const valStr = this.editandoNotaEx().get(idNotaExamen);
    if (valStr === undefined) return;
    const val = parseFloat(valStr);
    if (isNaN(val) || val < 0 || val > 20) {
      alert("La nota debe ser un número entre 0 y 20");
      return;
    }
    this.guardarNotaExamen.emit({ idNotaExamen, idExamen, nota: val });
    this.cancelarEditNotaEx(idNotaExamen);
  }
}
