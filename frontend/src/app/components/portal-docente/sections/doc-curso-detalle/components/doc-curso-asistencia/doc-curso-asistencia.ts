import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type {
  CursoDocente as Curso,
  AsistenciaAlumnoDocente as AsistenciaAlumno,
  ConsolidadoMensual
} from '../../../../../../shared/models/docente.models';

@Component({
  selector: 'app-doc-curso-asistencia',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doc-curso-asistencia.html',
  styleUrl: './doc-curso-asistencia.scss'
})
export class DocCursoAsistencia {
  @Input({ required: true }) cursoActivo!: Curso;
  @Input({ required: true }) asistenciaLocal: AsistenciaAlumno[] = [];
  @Input({ required: true }) asistenciaStats!: { presentes: number, faltas: number, tardanzas: number, justificados: number };
  @Input({ required: true }) asistenciaModificada = false;
  @Input({ required: true }) guardandoAsistencia = false;
  @Input({ required: true }) cargandoAsistencia = false;
  @Input({ required: true }) fechaAsistencia = '';
  @Input({ required: true }) fechasSesiones: string[] = [];
  @Input({ required: true }) mostrarConsolidado = false;
  @Input({ required: true }) mesConsolidado = '';
  @Input({ required: true }) cargandoConsolidado = false;
  @Input({ required: true }) datosConsolidado: ConsolidadoMensual | null = null;
  @Input({ required: true }) clasesDeHoy: Curso[] = [];
  @Input({ required: true }) today = '';

  @Output() cambiarFechaAsistencia = new EventEmitter<string>();
  @Output() guardarAsistencia = new EventEmitter<void>();
  @Output() marcarTodosPresentes = new EventEmitter<void>();
  @Output() setEstadoAsistencia = new EventEmitter<{ idAlumno: number, estado: string }>();
  @Output() setJustificanteAsistencia = new EventEmitter<{ idAlumno: number, justificante: string }>();
  @Output() verConsolidado = new EventEmitter<void>();
  @Output() cambiarMesConsolidado = new EventEmitter<number>();

  formatFechaCorta(fecha: string): string {
    if (!fecha) return '';
    const parts = fecha.split('-');
    if (parts.length < 3) return fecha;
    return `${parts[2]}/${parts[1]}`;
  }

  formatFechaLarga(fecha: string): string {
    if (!fecha) return '';
    try {
      const parts = fecha.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    } catch {
      return fecha;
    }
  }

  formatMes(mesStr: string): string {
    if (!mesStr) return '';
    try {
      const parts = mesStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
      return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    } catch {
      return mesStr;
    }
  }
}
