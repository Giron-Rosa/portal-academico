import { Component, Input, Output, EventEmitter, OnChanges, OnInit, OnDestroy, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { StudentNote, SaveNoteRequest } from '../../../../shared/models/alumno.models';

@Component({
  selector: 'app-alu-notebook',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alu-notebook.html',
  styleUrl: './alu-notebook.scss'
})
export class AluNotebook implements OnChanges, OnInit, OnDestroy {
  private sanitizer = inject(DomSanitizer);

  @Input({ required: true }) notes: StudentNote[] = [];
  @Input({ required: true }) cargandoNotes = false;
  @Input() notaActiva: StudentNote | null = null;
  @Input({ required: true }) guardandoNota = false;
  @Input({ required: true }) generandoResumen = false;

  @Output() seleccionarNota = new EventEmitter<StudentNote | null>();
  @Output() crearNota = new EventEmitter<SaveNoteRequest>();
  @Output() guardarNota = new EventEmitter<{ idNota: number, body: SaveNoteRequest }>();
  @Output() eliminarNota = new EventEmitter<number>();
  @Output() generarResumenIa = new EventEmitter<number>();
  @Output() subirDocumento = new EventEmitter<File>();
  @Output() generarPodcast = new EventEmitter<number>();

  // Local draft state
  editTitle = '';
  editContent = '';
  searchQuery = '';
  activeTab: 'edit' | 'ia' = 'edit';

  // Podcast player state
  podcastPlaying = false;
  podcastPaused = false;
  dialogLines: any[] = [];
  currentLineIndex = 0;
  activeSpeaker = '';
  activeLineText = '';
  voices: SpeechSynthesisVoice[] = [];
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  ngOnInit() {}

  getSafeDocumentUrl(url: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

  isPdfDocument(url: string | null | undefined): boolean {
    if (!url) return false;
    return url.toLowerCase().endsWith('.pdf');
  }

  isWordDocument(url: string | null | undefined): boolean {
    if (!url) return false;
    return url.toLowerCase().endsWith('.docx') || url.toLowerCase().endsWith('.doc');
  }

  ngOnDestroy() {
    this.stopPodcast();
  }

  stopPodcast() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.podcastPlaying = false;
    this.podcastPaused = false;
    this.currentUtterance = null;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['notaActiva']) {
      // Cancelar cualquier audio en reproducción al cambiar de nota
      this.stopPodcast();

      if (this.notaActiva) {
        this.editTitle = this.notaActiva.titulo;
        this.editContent = this.notaActiva.contenido ?? '';
        if (this.notaActiva.resumenIa) {
          this.activeTab = 'ia';
        } else {
          this.activeTab = 'edit';
        }
      } else {
        this.editTitle = '';
        this.editContent = '';
      }
    }
  }

  get filteredNotes(): StudentNote[] {
    if (!this.searchQuery.trim()) return this.notes;
    const q = this.searchQuery.toLowerCase();
    return this.notes.filter(n =>
      n.titulo.toLowerCase().includes(q) ||
      (n.contenido && n.contenido.toLowerCase().includes(q))
    );
  }

  onSelect(note: StudentNote) {
    this.seleccionarNota.emit(note);
  }

  onNewNote() {
    this.crearNota.emit({ titulo: 'Nueva Nota', contenido: '' });
  }

  onSave() {
    if (!this.notaActiva) return;
    this.guardarNota.emit({
      idNota: this.notaActiva.idNota,
      body: { titulo: this.editTitle, contenido: this.editContent }
    });
  }

  onDelete() {
    if (!this.notaActiva) return;
    if (confirm('¿Estás seguro de que deseas eliminar esta nota?')) {
      this.eliminarNota.emit(this.notaActiva.idNota);
    }
  }

  onGenerateAiSummary() {
    if (!this.notaActiva) return;
    this.generarResumenIa.emit(this.notaActiva.idNota);
  }

  renderMarkdown(md: string | null | undefined): string {
    if (!md) return '';
    
    // Escape simple HTML characters to prevent XSS
    let escaped = md
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
      
    const lines = escaped.split('\n');
    let inList = false;
    let result: string[] = [];
    
    for (let line of lines) {
      let trimmed = line.trim();
      
      if (trimmed.startsWith('####')) {
        if (inList) { result.push('</ul>'); inList = false; }
        result.push('<h5>' + this.formatInlineMarkdown(trimmed.replace(/^####\s*/, '')) + '</h5>');
      } else if (trimmed.startsWith('###')) {
        if (inList) { result.push('</ul>'); inList = false; }
        result.push('<h4>' + this.formatInlineMarkdown(trimmed.replace(/^###\s*/, '')) + '</h4>');
      } else if (trimmed.startsWith('##')) {
        if (inList) { result.push('</ul>'); inList = false; }
        result.push('<h3>' + this.formatInlineMarkdown(trimmed.replace(/^##\s*/, '')) + '</h3>');
      } else if (trimmed.startsWith('#')) {
        if (inList) { result.push('</ul>'); inList = false; }
        result.push('<h2>' + this.formatInlineMarkdown(trimmed.replace(/^#\s*/, '')) + '</h2>');
      } else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
        if (!inList) { result.push('<ul class="nb-md-list">'); inList = true; }
        let itemContent = this.formatInlineMarkdown(trimmed.replace(/^[-*]\s*/, ''));
        result.push('<li>' + itemContent + '</li>');
      } else if (/^\d+\.\s/.test(trimmed)) {
        if (inList) { result.push('</ul>'); inList = false; }
        let match = trimmed.match(/^(\d+)\.\s*/);
        let num = match ? match[1] : '1';
        let itemContent = this.formatInlineMarkdown(trimmed.replace(/^\d+\.\s*/, ''));
        result.push('<div class="nb-md-num-item"><span class="nb-md-num">' + num + '.</span> ' + itemContent + '</div>');
      } else if (trimmed.length > 0) {
        if (inList) { result.push('</ul>'); inList = false; }
        result.push('<p>' + this.formatInlineMarkdown(trimmed) + '</p>');
      } else {
        if (inList) { result.push('</ul>'); inList = false; }
      }
    }
    if (inList) { result.push('</ul>'); }
    
    return result.join('\n');
  }

  private formatInlineMarkdown(text: string): string {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.*?)__/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="nb-md-code">$1</code>');
  }

  onFileSelected(event: any) {
    const file = event.target?.files?.[0];
    if (file) {
      this.subirDocumento.emit(file);
      event.target.value = '';
    }
  }

  onGeneratePodcast() {
    if (!this.notaActiva) return;
    this.generarPodcast.emit(this.notaActiva.idNota);
  }

  playPodcast() {
    if (this.podcastPaused) {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.resume();
      }
      this.podcastPlaying = true;
      this.podcastPaused = false;
      return;
    }

    if (!this.notaActiva || !this.notaActiva.guionPodcast) return;

    try {
      this.dialogLines = JSON.parse(this.notaActiva.guionPodcast);
      this.currentLineIndex = 0;
      this.podcastPlaying = true;
      this.podcastPaused = false;
      this.speakLine();
    } catch (e) {
      console.error('Error al parsear el guion del podcast', e);
      alert('El formato del podcast generado no es válido.');
    }
  }

  private speakLine() {
    if (!this.podcastPlaying) return;

    if (this.currentLineIndex >= this.dialogLines.length) {
      this.stopPodcast();
      return;
    }

    const line = this.dialogLines[this.currentLineIndex];
    this.activeSpeaker = line.locutor;
    this.activeLineText = line.texto;

    this.currentUtterance = new SpeechSynthesisUtterance(line.texto);
    this.currentUtterance.lang = 'es-PE';

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const allVoices = window.speechSynthesis.getVoices();
      const spanishVoices = allVoices.filter(v => v.lang.startsWith('es'));
      
      if (line.locutor === 'Tutor') {
        if (spanishVoices.length > 0) {
          this.currentUtterance.voice = spanishVoices[0];
        }
        this.currentUtterance.pitch = 0.9;
        this.currentUtterance.rate = 0.95;
      } else {
        if (spanishVoices.length > 1) {
          this.currentUtterance.voice = spanishVoices[1];
        } else if (spanishVoices.length > 0) {
          this.currentUtterance.voice = spanishVoices[0];
        }
        this.currentUtterance.pitch = 1.15;
        this.currentUtterance.rate = 1.05;
      }
    }

    this.currentUtterance.onend = () => {
      if (this.podcastPlaying) {
        this.currentLineIndex++;
        setTimeout(() => this.speakLine(), 600);
      }
    };

    this.currentUtterance.onerror = (err) => {
      console.error('SpeechSynthesis error:', err);
      this.stopPodcast();
    };

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.speak(this.currentUtterance);
    }
  }

  pausePodcast() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.pause();
    }
    this.podcastPlaying = false;
    this.podcastPaused = true;
  }
}
