import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pad-cursos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pad-cursos.html',
  styleUrl: './pad-cursos.scss'
})
export class PadCursos {
  @Input({ required: true }) hijos: any[] = [];
  @Input({ required: true }) hijoIdx = 0;
  @Input({ required: true }) cargandoCursos = false;
  @Input({ required: true }) errorCursos = '';
  @Input({ required: true }) hijoActual: any = null;
  @Input({ required: true }) cursosHijo: any[] = [];
  @Input({ required: true }) cursoExpandido = -1;
  @Input({ required: true }) tabCurso: 'tareas' | 'examenes' = 'tareas';

  @Output() cambiarHijo = new EventEmitter<number>();
  @Output() retryCargarCursos = new EventEmitter<string>();
  @Output() toggleCurso = new EventEmitter<number>();
  @Output() setTabCurso = new EventEmitter<'tareas' | 'examenes'>();

  getNotaColor(nota: number | null, max: number): string {
    if (nota === null) return '#94a3b8';
    const pct = (nota / max) * 100;
    if (pct >= 80) return '#22c55e';
    if (pct >= 60) return '#eab308';
    return '#c1121f';
  }

  getBarColor(p: number): string {
    if (p >= 80) return '#22c55e';
    if (p >= 60) return '#eab308';
    return '#c1121f';
  }

  getDesempeno(p: number): string {
    if (p >= 80) return 'Excelente';
    if (p >= 60) return 'Regular';
    return 'Necesita mejorar';
  }
}
