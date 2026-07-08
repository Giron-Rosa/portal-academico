import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-adm-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './adm-dashboard.html',
  styleUrl: './adm-dashboard.scss'
})
export class AdmDashboard {
  @Input({ required: true }) kpis: any = null;
  @Input({ required: true }) cargandoAnalisis = false;
  @Input({ required: true }) analisisResultado: string | null = null;
  @Input({ required: true }) alertasEfectividad: any[] = [];
  @Input({ required: true }) tutorScores: any[] = [];
  @Input({ required: true }) scoreAnalisisIA: string | null = null;

  @Output() generarAnalisisIA = new EventEmitter<void>();
}
