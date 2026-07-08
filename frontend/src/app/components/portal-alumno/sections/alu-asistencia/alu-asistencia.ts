import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alu-asistencia',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alu-asistencia.html',
  styleUrl: './alu-asistencia.scss'
})
export class AluAsistencia {
  @Input({ required: true }) totalClasesAsistencia = 0;
  @Input({ required: true }) totalPresenteAsistencia = 0;
  @Input({ required: true }) totalTardanzaAsistencia = 0;
  @Input({ required: true }) totalFaltaAsistencia = 0;
  @Input({ required: true }) totalJustificadoAsistencia = 0;
  @Input({ required: true }) porcentajeGlobalAsistencia = 100;
  @Input({ required: true }) cargandoAsistencias = false;
  @Input({ required: true }) asistenciasGlobales: any[] = [];
}
