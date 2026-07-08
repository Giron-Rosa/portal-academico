import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-adm-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './adm-modal.html',
  styleUrl: './adm-modal.scss'
})
export class AdmModal {
  @Input({ required: true }) modalAbierto: 'estudiante' | 'docente' | 'padre' | 'nota' | null = null;
  @Input({ required: true }) modoEdicion = false;
  @Input({ required: true }) formEstudiante: any = {};
  @Input({ required: true }) formDocente: any = {};
  @Input({ required: true }) formPadre: any = {};
  @Input({ required: true }) formNota: any = {};
  @Input({ required: true }) today = '';

  @Output() cerrarModal = new EventEmitter<void>();
  @Output() guardar = new EventEmitter<void>();

  @Output() formEstudianteChange = new EventEmitter<any>();
  @Output() formDocenteChange = new EventEmitter<any>();
  @Output() formPadreChange = new EventEmitter<any>();
  @Output() formNotaChange = new EventEmitter<any>();

  onSubmit(event: Event) {
    event.preventDefault();
    this.guardar.emit();
  }
}
