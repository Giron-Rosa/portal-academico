import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alu-tareas',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alu-tareas.html',
  styleUrl: './alu-tareas.scss'
})
export class AluTareas {
  @Input({ required: true }) tareasPendientes: any[] = [];
  @Input({ required: true }) tareasEntregadas: any[] = [];
  @Input({ required: true }) tareasCalificadas: any[] = [];

  @Output() entregarTarea = new EventEmitter<any>();
  @Output() anularEntrega = new EventEmitter<any>();

  // Estados locales para arrastrar
  draggedTarea: any = null;
  activeDragOverCol = signal<string | null>(null);

  onDragStart(event: DragEvent, tarea: any) {
    this.draggedTarea = tarea;
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', String(tarea.idTarea));
      event.dataTransfer.effectAllowed = 'move';
    }
    const target = event.target as HTMLElement;
    target.classList.add('dragging');
  }

  onDragEnd(event: DragEvent) {
    this.draggedTarea = null;
    this.activeDragOverCol.set(null);
    const target = event.target as HTMLElement;
    target.classList.remove('dragging');
  }

  onDragOver(event: DragEvent, col: string) {
    if (this.draggedTarea) {
      event.preventDefault();
      this.activeDragOverCol.set(col);
    }
  }

  onDragLeave(event: DragEvent, col: string) {
    if (this.activeDragOverCol() === col) {
      this.activeDragOverCol.set(null);
    }
  }

  onDrop(event: DragEvent, col: string) {
    event.preventDefault();
    this.activeDragOverCol.set(null);
    if (!this.draggedTarea) return;

    const t = this.draggedTarea;
    this.draggedTarea = null;

    if (col === 'pendiente') {
      if (t.entregado) {
        this.anularEntrega.emit(t);
      }
    } else if (col === 'entregado') {
      if (!t.entregado) {
        this.entregarTarea.emit(t);
      } else if (t.nota !== null) {
        alert('No se puede descalificar una tarea calificada directamente.');
      }
    } else if (col === 'calificado') {
      alert('Las tareas solo pueden ser calificadas por el docente.');
    }
  }
}
