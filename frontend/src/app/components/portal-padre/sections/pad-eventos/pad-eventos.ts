import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pad-eventos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pad-eventos.html',
  styleUrl: './pad-eventos.scss'
})
export class PadEventos {
  @Input({ required: true }) hijos: any[] = [];
  @Input({ required: true }) hijoIdx = 0;
  @Input({ required: true }) cargandoEventos = false;
  @Input({ required: true }) errorEventos = '';
  @Input({ required: true }) eventosHijo: any[] = [];
  @Input({ required: true }) hijoActual: any = null;

  @Output() cambiarHijo = new EventEmitter<number>();
  @Output() retryCargarEventos = new EventEmitter<string>();

  getBadgeEventoIcon(tipo: string): string {
    const t = tipo.toLowerCase();
    if (t === 'examen') return '📝';
    if (t === 'actividad') return '🏆';
    if (t === 'reunion_padres') return '👥';
    if (t === 'paseo') return '🚌';
    if (t === 'dia_festivo') return '🎉';
    return '📢';
  }

  getBadgeEventoLabel(tipo: string): string {
    const t = tipo.toLowerCase();
    if (t === 'examen') return 'Examen';
    if (t === 'actividad') return 'Actividad';
    if (t === 'reunion_padres') return 'Reunión';
    if (t === 'paseo') return 'Paseo';
    if (t === 'dia_festivo') return 'Festivo';
    return 'General';
  }
}
