import { Component, inject, signal, OnInit, HostListener } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PdfStudyService } from '../../../services/pdf-study.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

type Seccion = 'inicio' | 'calendario' | 'kanban' | 'refuerzo' | 'recursos' | 'estudio-inteligente';

interface CursoApi {
  nombre: string;
  area: string;
  horasSemana: number;
  grado: string;
  seccion: string;
  turno: string;
  periodo: string;
  docente: string;
}

export interface Curso {
  nombre: string;
  grado: string;
  seccion: string;
  turno: string;
  horasSemana: number;
  docente: string;
  color: string;
  areaKey: string;
}

interface Actividad {
  tipo: string;
  titulo: string;
  curso: string;
  vence: string;
  estado: 'pendiente' | 'entregado' | 'vencido';
}

@Component({
  selector: 'app-portal-alumno',
  imports: [CommonModule, FormsModule],
  templateUrl: './portal-alumno.html',
  styleUrl: './portal-alumno.scss',
})
export class PortalAlumno implements OnInit {
  private router = inject(Router);
  private auth = inject(AuthService);
  private http = inject(HttpClient);
  private pdfStudyService = inject(PdfStudyService);
  private sanitizer = inject(DomSanitizer);

  private readonly API = 'http://localhost:8080/api/portal/alumno/mis-cursos';

  seccionActiva = signal<Seccion>('inicio');
  dropdownOpen = signal(false);
  periodo = signal('');
  cargando = signal(true);
  errorCarga = signal('');
  cursos = signal<Curso[]>([]);

  // Lector PDF Inteligente
  selectedFile = signal<File | null>(null);
  pdfUrl = signal<SafeResourceUrl | null>(null);
  analyzing = signal(false);
  chatting = signal(false);
  currentTab = signal<'summary' | 'tactics' | 'quiz' | 'chat'>('summary');
  analysisResult = signal<any>(null);
  questionInput = signal<string>('');
  chatMessages = signal<{role: 'user' | 'model', text: string}[]>([]);
  quizAnswers = signal<Record<number, number>>({});
  quizSubmitted = signal(false);
  errorEstudio = signal('');

  nombre = this.auth.getNombre() ?? 'Estudiante';
  codigo = this.auth.getCodigo() ?? '';
  iniciales = this.nombre.split(' ').map((p: string) => p[0]).join('').slice(0, 2).toUpperCase();

  navItems: { id: Seccion; label: string; icon: string }[] = [
    { id: 'inicio', label: 'Inicio', icon: 'home' },
    { id: 'calendario', label: 'Calendario', icon: 'calendar' },
    { id: 'kanban', label: 'Kanban', icon: 'kanban' },
    { id: 'refuerzo', label: 'Refuerzo', icon: 'refuerzo' },
    { id: 'recursos', label: 'Recursos', icon: 'recursos' },
    { id: 'estudio-inteligente', label: 'Estudio IA', icon: 'brain' },
  ];

  actividades: Actividad[] = [
    { tipo: 'Evaluación', titulo: 'Práctica calificada', curso: 'Matemática', vence: '25/04 · 11:59 PM', estado: 'pendiente' },
    { tipo: 'Tarea', titulo: 'Ensayo narrativo', curso: 'Comunicación', vence: '28/04 · 11:59 PM', estado: 'pendiente' },
    { tipo: 'Laboratorio', titulo: 'Informe de experimento', curso: 'Ciencia y Tecnología', vence: '30/04 · 11:59 PM', estado: 'pendiente' },
    { tipo: 'Examen', titulo: 'Quiz de vocabulario', curso: 'Inglés', vence: '26/04 · 08:00 AM', estado: 'vencido' },
  ];

  private readonly COLORES: Record<string, string> = {
    'Matemática': '#dce8f7',
    'Comunicación': '#fde8e8',
    'Ciencia y Tecnología': '#e8f7ec',
    'Historia, Geografía y Economía': '#f0e8f7',
    'Inglés': '#fef9e0',
    'Arte y Cultura': '#fde0ec',
    'Educación Física': '#e0f7ec',
    'Personal Social': '#e8f0fe',
    'Religión': '#f7f0e8',
  };

  private readonly AREA_KEY: Record<string, string> = {
    'Matemática': 'mat',
    'Comunicación': 'com',
    'Ciencias': 'cie',
    'Sociales': 'his',
    'Idiomas': 'ing',
    'Arte': 'art',
    'Educación Física': 'efi',
    'Formación': 'rel',
  };

  ngOnInit() {
    const token = this.auth.getToken();
    if (!token) { this.router.navigate(['/']); return; }

    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.get<CursoApi[]>(this.API, { headers }).subscribe({
      next: (data) => {
        if (data.length > 0) this.periodo.set(data[0].periodo);
        this.cursos.set(data.map(d => ({
          nombre: d.nombre,
          grado: d.grado,
          seccion: d.seccion,
          turno: d.turno,
          horasSemana: d.horasSemana,
          docente: d.docente,
          color: this.COLORES[d.nombre] ?? '#e8f0fb',
          areaKey: this.AREA_KEY[d.area] ?? 'gen',
        })));
        this.cargando.set(false);
      },
      error: () => {
        this.errorCarga.set('No se pudieron cargar los cursos. Intenta de nuevo.');
        this.cargando.set(false);
      },
    });
  }

  setSeccion(id: Seccion) { this.seccionActiva.set(id); this.dropdownOpen.set(false); }
  toggleDropdown() { this.dropdownOpen.update(v => !v); }

  pendientes = () => this.actividades.filter(a => a.estado === 'pendiente').length;

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    const t = e.target as HTMLElement;
    if (!t.closest('.pa-avatar-wrapper')) this.dropdownOpen.set(false);
  }

  // Métodos del Lector PDF Inteligente
  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile.set(file);
      const url = URL.createObjectURL(file);
      this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
      this.analyzeFile();
    }
  }

  onFileDropped(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      const file = event.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        this.selectedFile.set(file);
        const url = URL.createObjectURL(file);
        this.pdfUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
        this.analyzeFile();
      } else {
        this.errorEstudio.set('Solo se permiten archivos PDF.');
      }
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  analyzeFile() {
    const file = this.selectedFile();
    if (!file) return;

    this.analyzing.set(true);
    this.errorEstudio.set('');
    this.analysisResult.set(null);
    this.quizAnswers.set({});
    this.quizSubmitted.set(false);
    this.chatMessages.set([]);

    this.pdfStudyService.analyzePdf(file).subscribe({
      next: (res) => {
        this.analysisResult.set(res);
        this.analyzing.set(false);
      },
      error: (err) => {
        this.errorEstudio.set(err.error?.message || 'Error al analizar el PDF. Inténtalo de nuevo.');
        this.analyzing.set(false);
      }
    });
  }

  sendQuestion() {
    const file = this.selectedFile();
    const q = this.questionInput().trim();
    if (!file || !q) return;

    // Agregar mensaje del usuario localmente
    const currentMsgs = this.chatMessages();
    this.chatMessages.set([...currentMsgs, { role: 'user', text: q }]);
    this.questionInput.set('');
    this.chatting.set(true);

    // Formatear el historial para la API
    const history = currentMsgs.map(m => ({
      role: m.role,
      text: m.text
    }));

    this.pdfStudyService.chatWithPdf(file, q, history).subscribe({
      next: (res: any) => {
        this.chatMessages.set([...this.chatMessages(), { role: 'model', text: res.reply }]);
        this.chatting.set(false);
      },
      error: () => {
        this.errorEstudio.set('Error en la conversación.');
        this.chatting.set(false);
      }
    });
  }

  selectOption(qIndex: number, optIndex: number) {
    if (this.quizSubmitted()) return;
    const current = { ...this.quizAnswers() };
    current[qIndex] = optIndex;
    this.quizAnswers.set(current);
  }

  submitQuiz() {
    this.quizSubmitted.set(true);
  }

  resetStudy() {
    this.selectedFile.set(null);
    this.pdfUrl.set(null);
    this.analysisResult.set(null);
    this.errorEstudio.set('');
    this.quizAnswers.set({});
    this.quizSubmitted.set(false);
    this.chatMessages.set([]);
    this.questionInput.set('');
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/']);
  }
}
