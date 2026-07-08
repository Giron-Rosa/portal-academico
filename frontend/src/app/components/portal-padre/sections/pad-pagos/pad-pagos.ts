import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pad-pagos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pad-pagos.html',
  styleUrl: './pad-pagos.scss'
})
export class PadPagos {
  @Input({ required: true }) hijos: any[] = [];
  @Input({ required: true }) hijoIdx = 0;
  @Input({ required: true }) cargandoPagos = false;
  @Input({ required: true }) errorPagos = '';
  @Input({ required: true }) pagosHijo: any[] = [];
  @Input({ required: true }) pagandoConcepto: string | null = null;
  @Input({ required: true }) hijoActual: any = null;

  @Output() cambiarHijo = new EventEmitter<number>();
  @Output() retryCargarPagos = new EventEmitter<string>();
  @Output() simularPago = new EventEmitter<any>();
}
