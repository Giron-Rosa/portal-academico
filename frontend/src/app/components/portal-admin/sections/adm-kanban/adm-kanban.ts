import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-adm-kanban',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './adm-kanban.html',
  styleUrl: './adm-kanban.scss'
})
export class AdmKanban {
  @Input({ required: true }) notasPendientes: any[] = [];
  @Input({ required: true }) notasEnProgreso: any[] = [];
  @Input({ required: true }) notasCompletadas: any[] = [];

  @Output() abrirNuevo = new EventEmitter<void>();
  @Output() abrirEditar = new EventEmitter<any>();
  @Output() eliminar = new EventEmitter<number>();
  @Output() cambiarEstadoNota = new EventEmitter<{ nota: any, nuevoEstado: 'pendiente' | 'en_progreso' | 'completada' }>();
}
