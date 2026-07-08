import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pad-gamificacion',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pad-gamificacion.html',
  styleUrl: './pad-gamificacion.scss'
})
export class PadGamificacion {
  @Input({ required: true }) misionesSemanales: any[] = [];
  @Input({ required: true }) insigniasObtenidas: any[] = [];
  @Input({ required: true }) progresoMisionesGeneral = 0;
}
