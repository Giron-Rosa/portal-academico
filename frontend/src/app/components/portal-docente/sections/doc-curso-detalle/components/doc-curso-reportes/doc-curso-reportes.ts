import { Component, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type {
  AlumnoReportes,
  FormReporte,
  ReporteDocente as Reporte
} from '../../../../../../shared/models/docente.models';

@Component({
  selector: 'app-doc-curso-reportes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doc-curso-reportes.html',
  styleUrl: './doc-curso-reportes.scss'
})
export class DocCursoReportes {
  @Input({ required: true }) reportesAlumnos: AlumnoReportes[] = [];
  @Input({ required: true }) cargandoReportes = false;
  @Input({ required: true }) today = '';

  @Output() crearReporte = new EventEmitter<FormReporte>();
  @Output() eliminarReporte = new EventEmitter<{ idReporte: number, idAlumno: number }>();
  @Output() toggleVisibilidadReporte = new EventEmitter<{ idReporte: number, idAlumno: number }>();
  @Output() exportarCurso = new EventEmitter<'pdf' | 'excel'>();

  // Estados locales encapsulados
  mostrarFormReporte = signal(false);
  formReporte = signal<FormReporte>({ idAlumno: null, tipo: 'anotacion', titulo: '', descripcion: '', fecha: '', visiblePadre: false });
  enviandoReporte = signal(false);
  alumnosExpandidos = signal<Set<number>>(new Set());

  toggleFormReporte(show: boolean) {
    this.mostrarFormReporte.set(show);
    if (show) {
      this.formReporte.set({
        idAlumno: null,
        tipo: 'anotacion',
        titulo: '',
        descripcion: '',
        fecha: this.today,
        visiblePadre: false
      });
    }
  }

  setFormReporte(field: keyof FormReporte, val: any) {
    this.formReporte.update(f => {
      const copy = { ...f };
      (copy as any)[field] = val;
      return copy;
    });
  }

  enviarReporteForm() {
    const f = this.formReporte();
    if (!f.titulo.trim() || !f.idAlumno) return;
    this.enviandoReporte.set(true);
    this.crearReporte.emit(f);
    // Reiniciar
    this.mostrarFormReporte.set(false);
    this.enviandoReporte.set(false);
  }

  toggleAlumnoReportes(idAlumno: number) {
    this.alumnosExpandidos.update(s => {
      const copy = new Set(s);
      copy.has(idAlumno) ? copy.delete(idAlumno) : copy.add(idAlumno);
      return copy;
    });
  }

  contarTipoReporte(reportes: Reporte[], tipo: string): number {
    return reportes.filter(r => r.tipo === tipo).length;
  }

  tipoReporteInfo(tipo: string): { label: string, css: string } {
    switch (tipo) {
      case 'anotacion':
        return { label: '📝 Anotación', css: 'rp-tipo-anotacion' };
      case 'pendiente':
        return { label: '🔔 Pendiente', css: 'rp-tipo-pendiente' };
      case 'llamada_atencion':
        return { label: '⚠️ Atención', css: 'rp-tipo-atencion' };
      case 'felicitacion':
        return { label: '⭐ Felicitación', css: 'rp-tipo-felicitacion' };
      default:
        return { label: '📌 Otro', css: 'rp-tipo-otro' };
    }
  }
}
