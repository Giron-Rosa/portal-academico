import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-adm-docentes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './adm-docentes.html',
  styleUrl: './adm-docentes.scss'
})
export class AdmDocentes {
  @Input({ required: true }) docentes: any[] = [];

  @Output() abrirNuevo = new EventEmitter<void>();
  @Output() abrirEditar = new EventEmitter<any>();
  @Output() eliminar = new EventEmitter<number>();
}
