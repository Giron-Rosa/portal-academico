import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type {
  CursoDocente as Curso,
  ClaseHorario,
  Reserva,
  EspacioReserva,
  FormReserva
} from '../../../../shared/models/docente.models';

@Component({
  selector: 'app-doc-calendario',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doc-calendario.html',
  styleUrl: './doc-calendario.scss'
})
export class DocCalendario {
  // Datos del Padre
  @Input({ required: true }) horario: ClaseHorario[] = [];
  @Input({ required: true }) cargandoHorario = false;
  @Input({ required: true }) errorHorario = '';
  @Input({ required: true }) calendarioTab = 'mis-clases';
  @Input({ required: true }) reservas: Reserva[] = [];
  @Input({ required: true }) cargandoReservas = false;
  @Input({ required: true }) errorReservas = '';
  @Input({ required: true }) modalReserva = false;
  @Input({ required: true }) reservaEditando: number | null = null;
  @Input({ required: true }) enviandoReserva = false;
  @Input({ required: true }) errorDisponibilidad = '';
  @Input({ required: true }) okDisponibilidad = false;
  @Input({ required: true }) formReserva!: FormReserva;
  @Input({ required: true }) espaciosDisponibles: EspacioReserva[] = [];
  @Input({ required: true }) limiteTiempoSeleccionado = '';
  @Input({ required: true }) cursos: Curso[] = [];
  @Input({ required: true }) today = '';
  @Input({ required: true }) semanaLabel = '';
  @Input({ required: true }) semanaInicio!: Date;
  @Input({ required: true }) hoyDia = 0;

  // Outputs al padre
  @Output() setCalendarioTab = new EventEmitter<string>();
  @Output() prevSemana = new EventEmitter<void>();
  @Output() nextSemana = new EventEmitter<void>();
  @Output() hoySemana = new EventEmitter<void>();
  @Output() toggleModalReserva = new EventEmitter<boolean>();
  @Output() abrirCursoDesdeCalendario = new EventEmitter<{ curso: string, grado: string, seccion: string }>();
  @Output() editarReserva = new EventEmitter<Reserva>();
  @Output() abrirReservaEnHora = new EventEmitter<{ diaNum: number, hora: string }>();
  @Output() guardarReserva = new EventEmitter<void>();
  @Output() anularReserva = new EventEmitter<void>();
  @Output() setFormReserva = new EventEmitter<{ campo: keyof FormReserva, valor: any }>();

  // Constantes y lógica de la grilla
  calPxPorHour = 64;
  horasGrilla = ['07:00', '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00'];
  diasSemana = [
    { num: 1, corto: 'Lun' },
    { num: 2, corto: 'Mar' },
    { num: 3, corto: 'Mie' },
    { num: 4, corto: 'Jue' },
    { num: 5, corto: 'Vie' },
  ];
  altoGrilla = 576; // 9 horas * 64 px/hora

  // Helper de fechas
  fechaDeDia(diaNum: number): Date {
    const monday = new Date(this.semanaInicio);
    monday.setDate(monday.getDate() + (diaNum - 1));
    return monday;
  }

  clasesDelDia(diaNum: number): ClaseHorario[] {
    return this.horario.filter(c => c.dia === diaNum);
  }

  // Fecha ISO para un día de la semana visible (1=Lunes)
  fechaDeDiaStr(diaNum: number): string {
    const d = new Date(this.semanaInicio);
    d.setDate(d.getDate() + (diaNum - 1));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  reservasDelDia(diaNum: number): Reserva[] {
    const fStr = this.fechaDeDiaStr(diaNum);
    return this.reservas.filter(r => r.fecha === fStr);
  }

  // Helpers de posición vertical de bloques (07:00 es el 0)
  timeStrToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  blockTop(horaStr: string): number {
    const minStart = this.timeStrToMinutes('07:00');
    const minBlock = this.timeStrToMinutes(horaStr);
    const diff = minBlock - minStart;
    return Math.max(0, Math.floor((diff / 60) * this.calPxPorHour));
  }

  blockHeight(horaInicio: string, horaFin: string): number {
    const minStart = this.timeStrToMinutes(horaInicio);
    const minEnd = this.timeStrToMinutes(horaFin);
    const diff = minEnd - minStart;
    return Math.max(20, Math.floor((diff / 60) * this.calPxPorHour));
  }

  cursoColor(cursoNombre: string): string {
    const c = cursoNombre.toLowerCase();
    if (c.includes('matemática') || c.includes('álgebra') || c.includes('aritmética')) return '#1e3a8a';
    if (c.includes('comunicación') || c.includes('lengua') || c.includes('literatura')) return '#b91c1c';
    if (c.includes('ciencia') || c.includes('física') || c.includes('química') || c.includes('biología')) return '#047857';
    if (c.includes('historia') || c.includes('geografía') || c.includes('sociales')) return '#7c2d12';
    if (c.includes('inglés')) return '#6d28d9';
    if (c.includes('arte') || c.includes('religión')) return '#db2777';
    return '#4b5563';
  }
}
