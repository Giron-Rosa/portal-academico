import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alu-refuerzo',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alu-refuerzo.html',
  styleUrl: './alu-refuerzo.scss'
})
export class AluRefuerzo {
  @Input({ required: true }) tieneCursosEnRiesgo = false;
  @Input({ required: true }) cursosConRiesgo: any[] = [];
  @Input({ required: true }) semanaRefuerzoSeleccionada = 1;
  @Input({ required: true }) semanasLista: number[] = [];
  @Input({ required: true }) videosExplicativos: any[] = [];
  @Input({ required: true }) librosReferencia: any[] = [];
  @Input({ required: true }) fichasPractica: any[] = [];

  @Output() setSemanaRefuerzo = new EventEmitter<number>();
}
