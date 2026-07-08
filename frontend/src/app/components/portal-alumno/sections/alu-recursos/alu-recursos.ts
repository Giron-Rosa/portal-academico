import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-alu-recursos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './alu-recursos.html',
  styleUrl: './alu-recursos.scss'
})
export class AluRecursos {
  @Input({ required: true }) busquedaRecurso = '';
  @Input({ required: true }) categoriaRecursoActiva = '';
  @Input({ required: true }) categoriasRecursos: any[] = [];
  @Input({ required: true }) recursosFiltrados: any[] = [];

  @Output() setBusqueda = new EventEmitter<string>();
  @Output() setCategoria = new EventEmitter<string>();

  tipoIcon(tipo: string): string {
    const icons: Record<string, string> = {
      pdf: '📄', word: '📝', url: '🔗', video: '🎬', youtube: '▶️',
    };
    return icons[tipo] ?? '📎';
  }

  onInputSearch(e: Event) {
    const input = e.target as HTMLInputElement;
    this.setBusqueda.emit(input.value);
  }
}
