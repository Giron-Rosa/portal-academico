import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pad-asistencia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pad-asistencia.html',
  styleUrl: './pad-asistencia.scss'
})
export class PadAsistencia {
  @Input({ required: true }) hijos: any[] = [];
  @Input({ required: true }) hijoIdx = 0;
  @Input({ required: true }) cargandoAsistencia = false;
  @Input({ required: true }) errorAsistencia = '';
  @Input({ required: true }) asistenciaHijo: any = null;
  @Input({ required: true }) hijoActual: any = null;

  @Output() cambiarHijo = new EventEmitter<number>();
  @Output() retryCargarAsistencia = new EventEmitter<string>();

  getEstadoAsistenciaLabel(est: string): string {
    const e = est.toLowerCase();
    if (e === 'presente') return 'Presente';
    if (e === 'tardanza') return 'Tardanza';
    if (e === 'falta' || e === 'falto') return 'Inasistencia';
    if (e === 'justificado') return 'Justificado';
    return est;
  }

  getBarColor(p: number): string {
    if (p >= 80) return '#22c55e';
    if (p >= 60) return '#eab308';
    return '#c1121f';
  }
}
