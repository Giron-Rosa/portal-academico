import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alu-calificaciones',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alu-calificaciones.html',
  styleUrl: './alu-calificaciones.scss'
})
export class AluCalificaciones {
  @Input({ required: true }) promedioGeneral = 0;
  @Input({ required: true }) cursosAprobados = 0;
  @Input({ required: true }) cursosPorRecuperar = 0;
  @Input({ required: true }) cargandoCalificaciones = false;
  @Input({ required: true }) calificacionesGlobales: any[] = [];
}
