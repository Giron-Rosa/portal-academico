import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alu-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alu-inicio.html',
  styleUrl: './alu-inicio.scss'
})
export class AluInicio {
  @Input({ required: true }) cursos: any[] = [];
  @Input({ required: true }) periodo = '';
  @Input({ required: true }) cargando = false;
  @Input({ required: true }) errorCarga = '';
  @Input({ required: true }) actividades: any[] = [];

  @Output() abrirDetalleCurso = new EventEmitter<any>();
}
