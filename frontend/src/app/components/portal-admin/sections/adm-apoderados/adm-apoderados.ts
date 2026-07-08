import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-adm-apoderados',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './adm-apoderados.html',
  styleUrl: './adm-apoderados.scss'
})
export class AdmApoderados {
  @Input({ required: true }) padres: any[] = [];

  @Output() abrirNuevo = new EventEmitter<void>();
  @Output() abrirEditar = new EventEmitter<any>();
  @Output() eliminar = new EventEmitter<number>();
}
