// ===================================================================
// shared/models/alumno.models.ts
// Modelos del Portal Alumno y sus subcomponentes
// ===================================================================

// ── Tipos de navegación ──────────────────────────────────────────
export type SeccionAlumno =
  | 'inicio' | 'calificaciones' | 'asistencias'
  | 'calendario' | 'kanban' | 'refuerzo' | 'recursos';

// ── Curso ────────────────────────────────────────────────────────
export interface CursoAlumno {
  idAulaCurso:  number;
  nombre:       string;
  grado:        string;
  seccion:      string;
  turno:        string;
  horasSemana:  number;
  docente:      string;
  color:        string;
  areaKey:      string;
}

/** Shape raw que llega del endpoint /api/portal/alumno/mis-cursos */
export interface CursoAlumnoApi {
  idAulaCurso: number;
  nombre:      string;
  area:        string;
  horasSemana: number;
  grado:       string;
  seccion:     string;
  turno:       string;
  periodo:     string;
  docente:     string;
}

// ── Calificaciones ────────────────────────────────────────────────
export interface CalificacionGlobal {
  idAulaCurso: number;
  curso:       string;
  bim1:        number | null;
  bim2:        number | null;
  bim3:        number | null;
  bim4:        number | null;
}

// ── Asistencia global ─────────────────────────────────────────────
export interface AsistenciaGlobal {
  idAulaCurso: number;
  curso:       string;
  total:       number;
  presente:    number;
  tardanza:    number;
  falta:       number;
  justificado: number;
  porcentaje:  number;
}

// ── Actividad pendiente (dashboard inicio) ────────────────────────
export interface ActividadDashboard {
  tipo:   string;
  titulo: string;
  curso:  string;
  vence:  string;
  estado: 'pendiente' | 'entregado' | 'vencido';
}

// ── Material didáctico (pestaña Contenido de un curso) ───────────
export interface MaterialAlumno {
  idMaterial:    number;
  semana:        number;
  clase:         number;
  titulo:        string;
  tipo:          string;   // pdf | word | url | video | youtube
  url:           string | null;
  fechaCreacion: string;
}

// ── Tarea del alumno ──────────────────────────────────────────────
export interface TareaAlumno {
  idTarea:        number;
  numeroTarea:    number;
  semana:         number;
  clase:          number;
  titulo:         string;
  descripcion:    string | null;
  tipoEntregable: string | null;
  fechaEntrega:   string | null;
  notaMaxima:     number;
  nota:           number | null;
  entregado:      boolean;
}

/** TareaAlumno enriquecida con datos del curso (usada en el Kanban global) */
export interface TareaAlumnoExt extends TareaAlumno {
  idAulaCurso:  number;
  cursoNombre:  string;
}

// ── Actividad / Examen del alumno ─────────────────────────────────
export interface ActividadAlumno {
  idExamen:        number;
  numeroExamen:    number;
  semana:          number;
  titulo:          string;
  descripcion:     string | null;
  tipo:            string;  // escrito | oral | online | practico
  fechaExamen:     string | null;
  duracionMinutos: number | null;
  notaMaxima:      number;
  nota:            number | null;
  asistio:         boolean;
}

/** ActividadAlumno enriquecida con datos del curso */
export interface ActividadAlumnoExt extends ActividadAlumno {
  idAulaCurso: number;
  cursoNombre: string;
}

/** MaterialAlumno enriquecida con datos del curso */
export interface MaterialAlumnoExt extends MaterialAlumno {
  idAulaCurso: number;
  cursoNombre: string;
}

// ── Reporte / Anotación ───────────────────────────────────────────
export interface ReporteAlumno {
  idReporte:   number;
  tipo:        string;   // anotacion | felicitacion | llamada_atencion | otro
  titulo:      string;
  descripcion: string | null;
  fecha:       string;
}

// ── Asistencia del curso ───────────────────────────────────────────
export interface AsistenciaRegistroCurso {
  fecha:        string;       // 'YYYY-MM-DD'
  estado:       string;       // presente | falta | tardanza | justificado
  justificante: string | null;
}

export interface AsistenciaCurso {
  porcentaje:    number;
  totalSesiones: number;
  presentes:     number;
  faltas:        number;
  tardanzas:     number;
  justificados:  number;
  historial:     AsistenciaRegistroCurso[];
}

// ── Temario / Unidades ────────────────────────────────────────────
export interface UnidadAlumno {
  idUnidad:        number;
  idAulaCurso:     number;
  numero:          number;
  titulo:          string;
  bimestre:        string;
  semanas:         string;
  objetivos:       string[];
  indicadores:     string[];
  contenidos:      string[];
  estado:          'pendiente' | 'en_curso' | 'concluido';
  fechaConclusion?: string;
}

// ── Árbol de contenido (Semana > Clase > Materiales) ─────────────
export interface ClaseNodoAlumno {
  clase: number;
  items: MaterialAlumno[];
}

export interface SemanaNodoAlumno {
  semana:  number;
  clases:  ClaseNodoAlumno[];
}
