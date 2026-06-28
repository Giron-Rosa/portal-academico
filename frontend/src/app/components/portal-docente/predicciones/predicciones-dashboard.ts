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
