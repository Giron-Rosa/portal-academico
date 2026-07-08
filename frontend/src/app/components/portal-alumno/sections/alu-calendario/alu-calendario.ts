import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alu-calendario',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alu-calendario.html',
  styleUrl: './alu-calendario.scss'
})
export class AluCalendario {
  @Input({ required: true }) subSeccionCalendario: 'mensual' | 'horario' = 'mensual';
  @Input({ required: true }) nombreMesActual = '';
  @Input({ required: true }) anoActual = 2026;
  @Input({ required: true }) diasCalendario: any[] = [];
  @Input({ required: true }) horarioSemanal: any[] = [];

  @Output() setSubSeccion = new EventEmitter<'mensual' | 'horario'>();
  @Output() cambiarMes = new EventEmitter<number>();
}
