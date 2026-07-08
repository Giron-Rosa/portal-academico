import { Component, Input, Output, EventEmitter, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-doc-mensajes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './doc-mensajes.html',
  styleUrl: './doc-mensajes.scss'
})
export class DocMensajes {
  // Inputs de Estado
  @Input({ required: true }) mensajesFiltrados: any[] = [];
  @Input({ required: true }) mensajeActivo: any = null;
  @Input({ required: true }) cargandoMensajes = false;
  @Input({ required: true }) errorMensajes = '';
  private _replyText = '';
  @Input({ required: true })
  get replyText(): string {
    return this._replyText;
  }
  set replyText(val: string) {
    this._replyText = val;
    // Auto-resize textarea when text is updated programmatically
    setTimeout(() => {
      const el = document.querySelector('.msg-reply-input-chat') as HTMLTextAreaElement;
      if (el) {
        this.autoResize(el);
      }
    });
  }
  @Input({ required: true }) grabando = false;
  @Input({ required: true }) duracionGrabacion = 0;
  @Input() valoresFrecuencia: number[] = [];
  @Input({ required: true }) enviandoReply = false;
  @Input({ required: true }) refinandoConIA = false;
  @Input({ required: true }) sugiriendoRespuesta = false;
  @Input({ required: true }) dictando = false;
  @Input() interimText = ''; // texto provisional mientras dicta
  @Input({ required: true }) mostrarContexto = false;
  @Input({ required: true }) cargandoContexto = false;
  @Input({ required: true }) contextoAlumno: any = null;
  @Input({ required: true }) busquedaMsg = '';
  @Input({ required: true }) modalNuevoChat = false;
  @Input({ required: true }) nuevoChatAlumnoSel: any = null;
  @Input({ required: true }) nuevoChatGrado = '';
  @Input({ required: true }) nuevoChatSeccion = '';
  @Input({ required: true }) nuevoChatBusqueda = '';
  @Input({ required: true }) nuevoChatAsunto = '';
  @Input({ required: true }) nuevoChatMensaje = '';
  @Input({ required: true }) gradosDisponibles: string[] = [];
  @Input({ required: true }) seccionesDisponibles: string[] = [];
  @Input({ required: true }) alumnosFiltradosModal: any[] = [];
  @Input({ required: true }) cargandoAlumnos = false;
  @Input({ required: true }) enviandoNuevoChat = false;

  // Outputs al padre
  @Output() abrirMensaje = new EventEmitter<number>();
  @Output() cargarMensajes = new EventEmitter<void>();
  @Output() abrirModalNuevoChat = new EventEmitter<void>();
  @Output() cerrarModalNuevoChat = new EventEmitter<void>();
  @Output() seleccionarAlumnoModal = new EventEmitter<any>();
  @Output() enviarRespuesta = new EventEmitter<void>();
  @Output() iniciarGrabacion = new EventEmitter<void>();
  @Output() detenerGrabacion = new EventEmitter<void>();
  @Output() cancelarGrabacion = new EventEmitter<void>();
  @Output() toggleDictado = new EventEmitter<void>();
  @Output() copilotoSugerirRespuesta = new EventEmitter<void>();
  @Output() refinarMensajeConIA = new EventEmitter<'respuesta' | 'nuevo'>();
  @Output() enviarNuevoChat = new EventEmitter<void>();
  @Output() toggleContexto = new EventEmitter<void>();
  @Output() aplicarAccionRapida = new EventEmitter<'citacion' | 'inasistencia' | 'rendimiento' | 'recuperacion'>();

  @Output() changeReplyText = new EventEmitter<string>();
  @Output() changeBusquedaMsg = new EventEmitter<string>();
  @Output() changeNuevoChatBusqueda = new EventEmitter<string>();
  @Output() changeNuevoChatGrado = new EventEmitter<string>();
  @Output() changeNuevoChatSeccion = new EventEmitter<string>();
  @Output() changeNuevoChatAsunto = new EventEmitter<string>();
  @Output() changeNuevoChatMensaje = new EventEmitter<string>();

  @Output() toggleAudioPlay = new EventEmitter<any>();
  @Output() seekAudio = new EventEmitter<{ event: MouseEvent, target: any }>();

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

  formatAudioTime(secs: number): string {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  /** Enter sin Shift envía el mensaje; Shift+Enter inserta salto de línea. */
  onEnterKey(event: Event): void {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      ke.preventDefault();
      this.enviarRespuesta.emit();
    }
  }

  /** Auto-expande el textarea igual que WhatsApp: crece con el contenido y vuelve a 1 línea al borrar. */
  autoResize(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  pctAsistencia(): number {
    if (!this.contextoAlumno) return 100;
    const total = this.contextoAlumno.asistencias + this.contextoAlumno.faltas + this.contextoAlumno.tardanzas + this.contextoAlumno.justificadas;
    if (total === 0) return 100;
    return Math.round(((this.contextoAlumno.asistencias + this.contextoAlumno.tardanzas) / total) * 100);
  }
}
