import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-adm-estudiantes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './adm-estudiantes.html',
  styleUrl: './adm-estudiantes.scss'
})
export class AdmEstudiantes {
  @Input({ required: true }) estudiantes: any[] = [];

  @Output() exportar = new EventEmitter<'excel' | 'pdf'>();
  @Output() abrirNuevo = new EventEmitter<void>();
  @Output() abrirEditar = new EventEmitter<any>();
  @Output() eliminar = new EventEmitter<number>();
}
