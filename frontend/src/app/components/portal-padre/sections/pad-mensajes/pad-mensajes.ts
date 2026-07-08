import { Component, Input, Output, EventEmitter, signal, NgZone, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-pad-mensajes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pad-mensajes.html',
  styleUrl: './pad-mensajes.scss'
})
export class PadMensajes {
  private zone = inject(NgZone);

  @Input({ required: true }) mensajes: any[] = [];
  @Input({ required: true }) mensajeActivo: any | null = null;
  @Input({ required: true }) respuestasActivas: any[] = [];
  @Input({ required: true }) replyText = '';
  @Input({ required: true }) cargandoMensajes = false;
  @Input({ required: true }) errorMensajes = '';
  @Input({ required: true }) cargandoDetalleChat = false;
  @Input({ required: true }) enviandoReply = false;
  @Input({ required: true }) refinandoConIA = false;
  @Input({ required: true }) hasMorePages = false;
  @Input({ required: true }) cargandoMasRespuestas = false;
  @Input({ required: true }) modalNuevoChat = false;
  @Input({ required: true }) docentesDisponibles: any[] = [];
  @Input({ required: true }) nuevoChatDocenteSel: any | null = null;
  @Input({ required: true }) nuevoChatAsunto = '';
  @Input({ required: true }) nuevoChatMensaje = '';
  @Input({ required: true }) enviandoNuevoChat = false;

  @Output() abrirChat = new EventEmitter<number>();
  @Output() cerrarChat = new EventEmitter<void>();
  @Output() abrirNuevoChat = new EventEmitter<void>();
  @Output() cerrarNuevoChat = new EventEmitter<void>();
  @Output() enviarNuevoChat = new EventEmitter<{ docente: any, asunto: string, cuerpo: string }>();
  @Output() enviarRespuesta = new EventEmitter<string>();
  @Output() refinarMensajeConIA = new EventEmitter<'respuesta' | 'nuevo'>();
  @Output() cargarMasRespuestas = new EventEmitter<void>();
  @Output() enviarAudio = new EventEmitter<Blob>();
  
  @Output() updateReplyText = new EventEmitter<string>();
  @Output() updateNuevoChatAsunto = new EventEmitter<string>();
  @Output() updateNuevoChatMensaje = new EventEmitter<string>();
  @Output() updateNuevoChatDocenteSel = new EventEmitter<any>();

  // Estados locales de audio
  grabando = signal(false);
  duracionGrabacion = signal(0);
  mediaRecorder: any = null;
  audioChunks: Blob[] = [];
  recordingInterval: any = null;

  activeStream: any = null;
  audioCtx: any = null;
  analyser: any = null;
  animationFrameId: any = null;
  isAudioCancelled = false;
  valoresFrecuencia = signal<number[]>(Array(24).fill(4));

  dictando = signal(false);
  dictadoInterim = signal('');
  recognition: any = null;

  playingAudio: any = null;
  activeAudioRespuesta: any = null;

  noLeidosPadre(): number {
    return this.mensajes.filter(m => !m.leido).length;
  }

  toggleAudioPlay(r: any) {
    const audioUrl = 'http://localhost:8080' + r.cuerpo.replace('[AUDIO]', '').trim();
    
    if (this.playingAudio && this.activeAudioRespuesta === r) {
      if (r.isPlaying) {
        this.playingAudio.pause();
        r.isPlaying = false;
      } else {
        this.playingAudio.play();
        r.isPlaying = true;
      }
      return;
    }

    if (this.playingAudio) {
      this.playingAudio.pause();
      if (this.activeAudioRespuesta) {
        this.activeAudioRespuesta.isPlaying = false;
      }
    }

    const audio = new Audio(audioUrl);
    this.playingAudio = audio;
    this.activeAudioRespuesta = r;
    r.isPlaying = true;
    r.currentTime = 0;
    r.audioProgress = 0;

    audio.addEventListener('timeupdate', () => {
      this.zone.run(() => {
        r.currentTime = audio.currentTime;
        r.duration = audio.duration || 0;
        r.audioProgress = (audio.currentTime / (audio.duration || 1)) * 100;
      });
    });

    audio.addEventListener('ended', () => {
      this.zone.run(() => {
        r.isPlaying = false;
        r.audioProgress = 0;
        r.currentTime = 0;
        this.playingAudio = null;
        this.activeAudioRespuesta = null;
      });
    });

    audio.play();
  }

  seekAudio(event: MouseEvent, r: any) {
    if (!this.playingAudio || this.activeAudioRespuesta !== r) return;
    const bar = event.currentTarget as HTMLElement;
    const rect = bar.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = clickX / rect.width;
    const duration = this.playingAudio.duration || 0;
    this.playingAudio.currentTime = percentage * duration;
  }

  formatAudioTime(seconds: number): string {
    if (isNaN(seconds) || seconds === Infinity) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  iniciarGrabacion() {
    if (this.grabando()) return;
    this.zone.runOutsideAngular(() => {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then(stream => {
          this.activeStream = stream;
          this.audioChunks = [];

          // ─── VISUALIZADOR DE ONDAS DE AUDIO ───
          try {
            const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextClass();
            this.audioCtx = audioCtx;

            const source = audioCtx.createMediaStreamSource(stream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 64; // Bajo fftSize para tener 32 bins de frecuencia
            source.connect(analyser);
            this.analyser = analyser;

            const bufferLength = analyser.frequencyBinCount;
            const dataArray = new Uint8Array(bufferLength);

            const updateWaves = () => {
              if (!this.grabando() || !this.analyser) {
                return;
              }
              this.analyser.getByteFrequencyData(dataArray);

              // Mapear frecuencia a 24 barras de alturas (entre 4px y 36px)
              const heights: number[] = [];
              const step = Math.floor(bufferLength / 24) || 1;
              for (let i = 0; i < 24; i++) {
                const val = dataArray[i * step] || 0;
                const minHeight = 4;
                const maxHeight = 36;
                const hVal = minHeight + (val / 255) * (maxHeight - minHeight);
                heights.push(Math.round(hVal));
              }

              this.zone.run(() => {
                this.valoresFrecuencia.set(heights);
              });

              this.animationFrameId = requestAnimationFrame(updateWaves);
            };

            this.animationFrameId = requestAnimationFrame(updateWaves);
          } catch (audioErr) {
            console.warn('No se pudo inicializar AudioContext del visualizador:', audioErr);
          }

          // Auto-detectar el codec soportado
          const mimeType = [
            'audio/webm;codecs=opus',
            'audio/webm',
            'audio/ogg;codecs=opus',
            'audio/ogg',
            'audio/mp4',
          ].find((t: string) => MediaRecorder.isTypeSupported(t)) ?? '';

          const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
          this.mediaRecorder = recorder;

          recorder.ondataavailable = (e: BlobEvent) => {
            if (e.data && e.data.size > 0) {
              this.audioChunks.push(e.data);
            }
          };

          recorder.onstop = () => {
            // Detener pistas del micro
            stream.getTracks().forEach((t: any) => t.stop());
            this.activeStream = null;

            this.zone.run(() => {
              this.limpiarVisualizador();
            });

            if (this.isAudioCancelled) {
              this.audioChunks = [];
              return;
            }

            const blob = new Blob(this.audioChunks, { type: recorder.mimeType || 'audio/webm' });
            this.audioChunks = [];

            // Volver al zone solo para actualizar la UI y enviar
            this.zone.run(() => {
              if (blob.size > 0) {
                this.enviarAudio.emit(blob);
              } else {
                console.warn('El audio capturado está vacío (0 bytes).');
              }
            });
          };

          // Iniciar grabación sin timeslice para obtener un solo blob consolidado
          recorder.start();

          // Actualizar estado dentro del zone
          this.zone.run(() => {
            this.grabando.set(true);
            this.duracionGrabacion.set(0);
          });

          // El setInterval también fuera del zone
          this.recordingInterval = setInterval(() => {
            this.zone.run(() => this.duracionGrabacion.update(d => d + 1));
          }, 1000);
        })
        .catch(err => {
          this.zone.run(() => {
            if (err.name === 'NotAllowedError') {
              alert('Permiso de micrófono denegado. Habilítalo en la configuración del navegador.');
            } else {
              alert('No se pudo acceder al micrófono: ' + err.message);
            }
          });
        });
    });
  }

  detenerGrabacion() {
    if (!this.grabando() || !this.mediaRecorder) return;
    this.isAudioCancelled = false;
    clearInterval(this.recordingInterval);
    this.recordingInterval = null;
    this.grabando.set(false);
    this.limpiarVisualizador();
    try {
      this.mediaRecorder.stop();
    } catch (e) {
      console.warn('Error al detener grabador:', e);
    }
    this.mediaRecorder = null;
  }

  cancelarGrabacion() {
    if (!this.mediaRecorder) return;
    this.isAudioCancelled = true;
    clearInterval(this.recordingInterval);
    this.recordingInterval = null;
    this.grabando.set(false);
    this.limpiarVisualizador();
    try {
      this.mediaRecorder.stop();
    } catch (e) {
      console.warn('Error al detener grabador:', e);
    }
    this.mediaRecorder = null;
    if (this.activeStream) {
      this.activeStream.getTracks().forEach((t: any) => t.stop());
      this.activeStream = null;
    }
  }

  private limpiarVisualizador() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.audioCtx) {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.analyser = null;
    this.valoresFrecuencia.set(Array(24).fill(4));
  }

  toggleDictado() {
    if (this.dictando()) {
      this._stopDictado(true);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Tu navegador no soporta el reconocimiento de voz (dictado). Pruebe en Chrome, Edge o Safari.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = 'es-PE';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => {
      this.zone.run(() => {
        this.dictando.set(true);
      });
    };

    rec.onresult = (ev: any) => {
      let final = '';
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const text = ev.results[i][0].transcript;
        if (ev.results[i].isFinal) {
          final += text;
        } else {
          interim += text;
        }
      }
      this.zone.run(() => {
        if (final) {
          const prev = this.replyText;
          const updated = prev ? (prev + ' ' + final).trim() : final.trim();
          this.updateReplyText.emit(updated);
          this.dictadoInterim.set('');
        } else {
          this.dictadoInterim.set(interim);
        }
      });
    };

    rec.onerror = (err: any) => {
      console.error('Error en dictado de voz:', err);
      this.zone.run(() => {
        this._stopDictado(false);
      });
    };

    rec.onend = () => {
      if (this.dictando()) {
        try {
          rec.start();
        } catch {
          this.zone.run(() => this._stopDictado(false));
        }
      }
    };

    this.recognition = rec;
    rec.start();
  }

  private _stopDictado(commitInterim: boolean) {
    if (this.recognition) {
      try { this.recognition.stop(); } catch { /* ignorar */ }
      this.recognition = null;
    }
    if (commitInterim) {
      const interim = this.dictadoInterim();
      if (interim.trim()) {
        const prev = this.replyText;
        const updated = prev ? (prev + ' ' + interim).trim() : interim.trim();
        this.updateReplyText.emit(updated);
      }
    }
    this.dictando.set(false);
    this.dictadoInterim.set('');
  }

  onEnterKey(event: Event): void {
    const ke = event as KeyboardEvent;
    if (!ke.shiftKey) {
      ke.preventDefault();
      this.enviarRespuesta.emit(this.replyText);
    }
  }

  autoResize(el: HTMLTextAreaElement): void {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 160) + 'px';
  }

  submitNuevoChat() {
    this.enviarNuevoChat.emit({
      docente: this.nuevoChatDocenteSel,
      asunto: this.nuevoChatAsunto,
      cuerpo: this.nuevoChatMensaje
    });
  }
}
