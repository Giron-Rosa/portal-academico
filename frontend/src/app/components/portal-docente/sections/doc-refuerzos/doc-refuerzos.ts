import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type {
  ComunicadoDocente as Comunicado,
  AulaSimple,
  TipoEvento,
  FormComunicado
} from '../../../../shared/models/docente.models';

@Component({
  selector: 'app-doc-refuerzos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doc-refuerzos.html',
  styleUrl: './doc-refuerzos.scss'
})
export class DocRefuerzos {
  // Inputs de Estado
  @Input({ required: true }) comunicadosFiltrados: Comunicado[] = [];
  @Input({ required: true }) cargandoComunicados = false;
  @Input({ required: true }) errorComunicados = '';
  @Input({ required: true }) misAulas: AulaSimple[] = [];
  @Input({ required: true }) mostrarFormCom = false;
  @Input({ required: true }) enviandoCom = false;
  @Input({ required: true }) filtroGradoCom = '';
  @Input({ required: true }) tiposEvento: TipoEvento[] = [];
  @Input({ required: true }) formCom!: FormComunicado;
  @Input({ required: true }) today = '';

  // Outputs al padre
  @Output() toggleFormCom = new EventEmitter<void>();
  @Output() cargarComunicados = new EventEmitter<void>();
  @Output() enviarComunicado = new EventEmitter<void>();
  @Output() eliminarComunicado = new EventEmitter<number>();
  @Output() crearNuevoTipoEvento = new EventEmitter<void>();
  @Output() setFormCom = new EventEmitter<{ campo: keyof FormComunicado, valor: any }>();
  @Output() toggleAulaFormCom = new EventEmitter<number>();
  @Output() resetIdAulas = new EventEmitter<void>();
  @Output() setFiltroGradoCom = new EventEmitter<string>();

  // Helpers locales de presentación
  tiempoRelativo(fechaStr: string): string {
    if (!fechaStr) return '';
    try {
      const parts = fechaStr.split(' ');
      if (parts.length >= 2) {
        const [d, m, y] = parts[0].split('/').map(Number);
        const [h, min] = parts[1].split(':').map(Number);
        const date = new Date(y, m - 1, d, h, min);
        const diff = Date.now() - date.getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Ahora';
        if (mins < 60) return `Hace ${mins} min`;
        const hrs = Math.floor(mins / 60);
        if (hrs < 24) return `Hace ${hrs} h`;
        return parts[0];
      }
      return fechaStr;
    } catch {
      return fechaStr;
    }
  }

  colorTipo(tipo: string): string {
    const t = tipo.toLowerCase();
    if (t.includes('tarea') || t.includes('evaluación') || t.includes('examen')) return '#fef3c7'; // Naranja/Ambar claro
    if (t.includes('reunión') || t.includes('citación')) return '#dbeafe'; // Azul claro
    if (t.includes('refuerzo') || t.includes('taller')) return '#dcfce7'; // Verde claro
    return '#f3f4f6'; // Gris claro
  }

  colorTipoTexto(tipo: string): string {
    const t = tipo.toLowerCase();
    if (t.includes('tarea') || t.includes('evaluación') || t.includes('examen')) return '#b45309';
    if (t.includes('reunión') || t.includes('citación')) return '#1e40af';
    if (t.includes('refuerzo') || t.includes('taller')) return '#15803d';
    return '#374151';
  }

  labelTipo(tipo: string): string {
    return tipo.charAt(0).toUpperCase() + tipo.slice(1).replace('_', ' ');
  }
}
