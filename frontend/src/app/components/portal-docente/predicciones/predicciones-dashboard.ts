import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AuthService } from '../../../services/auth.service';

/** Datos crudos que devuelve el endpoint /predicciones */
interface AlumnoRaw {
  idAlumno: number;
  nombre: string;
  apellido: string;
  idAulaCurso: number;
  curso: string;
  grado: string;
  seccion: string;
  totalClases: number;
  clasesPresente: number;
  promedio: number;
}

/** Datos procesados con índice de riesgo calculado */
export interface AlumnoRiesgo extends AlumnoRaw {
  porcentajeAsistencia: number;
  indiceRiesgo: number;          // 0-100
  nivelRiesgo: 'alto' | 'medio' | 'bajo';
  causas: string[];
}

@Component({
  selector: 'app-predicciones-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './predicciones-dashboard.html',
  styleUrl: './predicciones-dashboard.scss',
})
export class PrediccionesDashboard implements OnInit {
  private http = inject(HttpClient);
  private auth = inject(AuthService);

  private readonly API = 'http://localhost:8080/api/portal/docente/predicciones';

  cargando   = signal(true);
  errorMsg   = signal('');
  alumnos    = signal<AlumnoRiesgo[]>([]);
  filtroRiesgo = signal<'todos' | 'alto' | 'medio' | 'bajo'>('todos');

  // ── IA Advisory Signals & Methods ──
  consejoIA = signal<string | null>(null);
  planIA = signal<any | null>(null);
  planIAError = signal<string | null>(null);
  cargandoIA = signal(false);
  alumnoSeleccionado = signal<AlumnoRiesgo | null>(null);

  // Persistence signals
  checksState = signal<string>('0,0,0');
  feedback1 = signal<string>('');
  feedback2 = signal<string>('');
  feedback3 = signal<string>('');
  abrirPopoverFeedback = signal<{ index: number; accion: string } | null>(null);

  esPlanCompletado = computed(() => this.checksState() === '1,1,1');

  consultarIA(alumno: AlumnoRiesgo) {
    this.alumnoSeleccionado.set(alumno);
    this.cargandoIA.set(true);
    this.consejoIA.set(null);
    this.planIA.set(null);
    this.planIAError.set(null);
    this.checksState.set('0,0,0');
    this.feedback1.set('');
    this.feedback2.set('');
    this.feedback3.set('');
    this.abrirPopoverFeedback.set(null);

    const token = this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    const url = `http://localhost:8080/api/portal/docente/predicciones/${alumno.idAlumno}/ia-advisory` +
                `?asistencia=${alumno.porcentajeAsistencia}` +
                `&promedio=${alumno.promedio}` +
                `&causas=${encodeURIComponent(alumno.causas.join(', '))}`;

    this.http.get<{ resultado: string, checksState: string, feedback_1?: string, feedback_2?: string, feedback_3?: string }>(url, { headers }).subscribe({
      next: res => {
        this.checksState.set(res.checksState || '0,0,0');
        this.feedback1.set(res.feedback_1 || '');
        this.feedback2.set(res.feedback_2 || '');
        this.feedback3.set(res.feedback_3 || '');

        try {
          const data = JSON.parse(res.resultado);
          if (data.error) {
            this.planIAError.set(data.error);
            this.planIA.set(null);
          } else {
            this.planIA.set(data);
            this.planIAError.set(null);
          }
        } catch (e) {
          this.consejoIA.set(res.resultado);
          this.planIA.set(null);
          this.planIAError.set(null);
        }
        this.cargandoIA.set(false);
      },
      error: () => {
        this.planIAError.set('No se pudo obtener el consejo pedagógico de la IA en este momento. Revisa la conexión o intenta más tarde.');
        this.planIA.set(null);
        this.cargandoIA.set(false);
      }
    });
  }

  isCheckActive(index: number): boolean {
    const states = this.checksState().split(',');
    return states[index] === '1';
  }

  onCheckToggle(index: number, event: any) {
    const isChecked = event.target.checked;
    event.target.checked = this.isCheckActive(index);

    if (isChecked) {
      const acciones = this.planIA()?.checklist_profesor;
      if (acciones && acciones[index]) {
        this.abrirPopoverFeedback.set({ index, accion: acciones[index] });
      }
    }
  }

  cancelarFeedback() {
    this.abrirPopoverFeedback.set(null);
  }

  guardarFeedback(index: number | undefined, comment: string) {
    if (index === undefined || this.cargandoIA()) return;
    this.cargandoIA.set(true);
    this.abrirPopoverFeedback.set(null);

    const token = this.auth.getToken();
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });

    this.http.post<any>('http://localhost:8080/api/portal/docente/predicciones/feedback-plan', {
      idAlumno: this.alumnoSeleccionado()?.idAlumno,
      checkIndex: index,
      feedback: comment
    }, { headers }).subscribe({
      next: (res) => {
        this.checksState.set(res.checksState);
        this.feedback1.set(res.feedback_1 || '');
        this.feedback2.set(res.feedback_2 || '');
        this.feedback3.set(res.feedback_3 || '');

        try {
          const data = JSON.parse(res.resultado);
          this.planIA.set(data);
          this.planIAError.set(null);
        } catch (e) {
          this.consejoIA.set(res.resultado);
          this.planIA.set(null);
        }
        this.cargandoIA.set(false);
      },
      error: () => {
        alert('No se pudo registrar la bitácora en este momento.');
        this.cargandoIA.set(false);
      }
    });
  }

  generarActaCompromiso() {
    const idAlumno = this.alumnoSeleccionado()?.idAlumno;
    if (idAlumno) {
      window.open(`http://localhost:8080/api/portal/docente/predicciones/${idAlumno}/generar-acta`, '_blank');
    }
  }

  copiarMensajePadres() {
    const plan = this.planIA();
    if (plan && plan.sugerencia_mensaje_padres) {
      const fullText = `Asunto: ${plan.sugerencia_mensaje_padres.asunto}\n\n${plan.sugerencia_mensaje_padres.cuerpo}`;
      navigator.clipboard.writeText(fullText).then(() => {
        alert('¡Mensaje copiado al portapapeles con éxito!');
      });
    }
  }

  cerrarModalIA() {
    this.consejoIA.set(null);
    this.planIA.set(null);
    this.planIAError.set(null);
    this.checksState.set('0,0,0');
    this.feedback1.set('');
    this.feedback2.set('');
    this.feedback3.set('');
    this.abrirPopoverFeedback.set(null);
    this.alumnoSeleccionado.set(null);
  }


  // ── Estadísticas de resumen ──────────────────────────────────────────
  totalAlumnos = computed(() => this.alumnos().length);
  enRiesgoAlto = computed(() => this.alumnos().filter(a => a.nivelRiesgo === 'alto').length);
  enRiesgoMedio= computed(() => this.alumnos().filter(a => a.nivelRiesgo === 'medio').length);
  enRiesgoBajo = computed(() => this.alumnos().filter(a => a.nivelRiesgo === 'bajo').length);

  alumnosFiltrados = computed(() => {
    const f = this.filtroRiesgo();
    return f === 'todos'
      ? this.alumnos().slice().sort((a, b) => b.indiceRiesgo - a.indiceRiesgo)
      : this.alumnos()
          .filter(a => a.nivelRiesgo === f)
          .sort((a, b) => b.indiceRiesgo - a.indiceRiesgo);
  });

  ngOnInit() {
    const token = this.auth.getToken();
    if (!token) { this.errorMsg.set('No autenticado.'); this.cargando.set(false); return; }
    const headers = new HttpHeaders({ Authorization: `Bearer ${token}` });
    this.http.get<AlumnoRaw[]>(this.API, { headers }).subscribe({
      next: data => {
        this.alumnos.set(data.map(a => this.calcularRiesgo(a)));
        this.cargando.set(false);
      },
      error: () => {
        this.errorMsg.set('No se pudieron cargar los datos de predicciones.');
        this.cargando.set(false);
      },
    });
  }

  setFiltro(f: 'todos' | 'alto' | 'medio' | 'bajo') {
    this.filtroRiesgo.set(f);
  }

  /** Calcula el índice de riesgo (0-100) y el nivel de semáforo. */
  private calcularRiesgo(a: AlumnoRaw): AlumnoRiesgo {
    const pctAsistencia = a.totalClases === 0
      ? 100
      : Math.round((a.clasesPresente / a.totalClases) * 1000) / 10;

    const causas: string[] = [];

    // Factor 1: asistencia (peso 60%)
    let factorAsistencia = 0;
    if (pctAsistencia < 60)       { factorAsistencia = 100; causas.push('Tasa de absentismo superior al 40%'); }
    else if (pctAsistencia < 70)  { factorAsistencia = 80;  causas.push('Tasa de absentismo superior al 30%'); }
    else if (pctAsistencia < 80)  { factorAsistencia = 55;  causas.push('Tasa de absentismo superior al 20%'); }
    else if (pctAsistencia < 90)  { factorAsistencia = 30;  causas.push('Asistencia regular (< 90%)'); }

    // Factor 2: promedio de notas (peso 40%)
    let factorNota = 0;
    const prom = a.promedio;
    if (prom === 0)               { factorNota = 0; }   // sin datos todavía
    else if (prom < 8)            { factorNota = 100; causas.push('Promedio acumulado crítico (< 8.0)'); }
    else if (prom < 10.5)         { factorNota = 70;  causas.push('Promedio acumulado < 10.5'); }
    else if (prom < 13)           { factorNota = 35;  causas.push('Promedio por debajo del nivel esperado'); }

    const indiceRiesgo = Math.min(100, Math.round(factorAsistencia * 0.6 + factorNota * 0.4));

    const nivelRiesgo: AlumnoRiesgo['nivelRiesgo'] =
      indiceRiesgo >= 60 ? 'alto' :
      indiceRiesgo >= 30 ? 'medio' : 'bajo';

    if (causas.length === 0) causas.push('Sin alertas detectadas');

    return { ...a, porcentajeAsistencia: pctAsistencia, indiceRiesgo, nivelRiesgo, causas };
  }
}
