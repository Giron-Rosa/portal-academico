import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import type { CursoDocente as Curso, PendienteDocente as Pendiente, AlertaCritica } from '../../../../shared/models/docente.models';

@Component({
  selector: 'app-doc-inicio',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './doc-inicio.html',
  styleUrl: './doc-inicio.scss'
})
export class DocInicio {
  @Input({ required: true }) cursos: Curso[] = [];
  @Input({ required: true }) pendientes: Pendiente[] = [];
  @Input({ required: true }) clasesDeHoy: Curso[] = [];
  @Input({ required: true }) alertasCriticas: AlertaCritica[] = [];
  @Input({ required: true }) errorCarga = '';
  @Input({ required: true }) cargando = false;
  @Input({ required: true }) grades: string[] = [];
  @Input({ required: true }) activeGrade = '';
  @Input({ required: true }) filteredCursos: Curso[] = [];

  @Output() abrirCurso = new EventEmitter<Curso>();
  @Output() comunicarConPadre = new EventEmitter<number>();
  @Output() setGrade = new EventEmitter<string>();

  alertaSeleccionada = signal<AlertaCritica | null>(null);
}
