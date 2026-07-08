import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pad-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pad-inicio.html',
  styleUrl: './pad-inicio.scss'
})
export class PadInicio {
  @Input({ required: true }) vista: 'dashboard' | 'detalle' = 'dashboard';
  @Input({ required: true }) cargando = false;
  @Input({ required: true }) errorCarga = '';
  @Input({ required: true }) hijosEnRiesgo = 0;
  @Input({ required: true }) hijos: any[] = [];
  @Input({ required: true }) hijoIdx = 0;
  @Input({ required: true }) cargandoHorario = false;
  @Input({ required: true }) errorHorario = '';
  @Input({ required: true }) horarioHijo: any[] = [];
  @Input({ required: true }) eventosHijo: any[] = [];

  @Output() verDetalle = new EventEmitter<number>();
  @Output() volverDashboard = new EventEmitter<void>();
  @Output() setSeccion = new EventEmitter<any>();
  @Output() setHijoIdx = new EventEmitter<number>();

  get hijoActual(): any {
    return this.hijos[this.hijoIdx];
  }

  getEstadoLabel(e: string): string {
    return e === 'bueno' ? 'Bueno' : e === 'observacion' ? 'En observación' : 'En riesgo';
  }

  getBarColor(p: number): string {
    if (p >= 80) return '#22c55e';
    if (p >= 60) return '#eab308';
    return '#c1121f';
  }

  getClase(dia: number, hora: string): any {
    return this.horarioHijo.find(h => h.dia === dia && h.horaInicio === hora);
  }
}
