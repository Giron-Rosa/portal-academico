// ===================================================================
// shared/models/docente.models.ts
// Modelos del Portal Docente
// ===================================================================

// ── Tipos de navegación ──────────────────────────────────────────
export type SeccionDocente =
  | 'inicio' | 'calendario' | 'mensajes'
  | 'refuerzos' | 'predicciones' | 'curso-detalle';

// ── Curso ────────────────────────────────────────────────────────
export interface CursoDocente {
  idAulaCurso:  number;
  nombre:       string;
  grado:        string;
  seccion:      string;
  color:        string;
  iconType:     string;
  badge:        string;
  horasSemana:  number;
  totalAlumnos: number;
}

/** Shape raw del endpoint GET /api/portal/docente/mis-cursos */
export interface CursoDocenteApi {
  idAulaCurso:  number;
  nombre:       string;
  grado:        string;
  seccion:      string;
  horasSemana:  number;
  turno:        string;
  periodo:      string;
  totalAlumnos: number;
}

// ── Dashboard ────────────────────────────────────────────────────
export interface PendienteDocente {
  idAulaCurso:  number;
  tipo:         string;    // 'tarea' | 'examen'
  grado:        string;
  seccion:      string;
  curso:        string;
  titulo:       string;
  sinCalificar: number;
  totalAlumnos: number;
}

export interface AlertaCritica {
  idAlumno:    number;
  nombre:      string;
  descripcion: string;
  tipo:        string;    // 'rendimiento' | 'asistencia'
  inicial:     string;
  color:       string;
}

// ── Horario / Calendario ─────────────────────────────────────────
export interface ClaseHorario {
  dia:          number;         // 1=Lunes … 5=Viernes
  diaNombre:    string;         // "Lunes", "Martes"…
  horaInicio:   string;         // "07:30"
  horaFin:      string;         // "09:00"
  curso:        string;
  grado:        string;
  seccion:      string;
  idAulaCurso?: number;
}

// ── Reservas de Espacios ─────────────────────────────────────────
export interface EspacioReserva {
  idEspacio:     number;
  nombre:        string;
  area:          string;
  limiteMinutos: number;
}

export interface Reserva {
  id:            number;
  idMaestro:     number;
  espacio:       string;
  fecha:         string;         // "YYYY-MM-DD"
  horaInicio:    string;         // "HH:mm"
  horaFin:       string;         // "HH:mm"
  idAulaCurso:   number | null;
  curso:         string | null;
  grado:         string | null;
  seccion:       string | null;
  proposito:     string;
  fechaCreacion: string;
}

export interface FormReserva {
  espacio:     string;
  fecha:       string;
  horaInicio:  string;
  horaFin:     string;
  idAulaCurso: number | null;
  proposito:   string;
}

// ── Mensajería ───────────────────────────────────────────────────
export interface MensajeResumenDocente {
  id:              number;
  asunto:          string;
  tipo:            string;             // 'justificante' | 'consulta' | 'otro'
  leido:           boolean;
  fechaEnvio:      string;             // "DD/MM/YYYY HH:MM"
  nombrePadre:     string;
  nombreAlumno:    string | null;
  idAlumno:        number | null;
  grado:           string | null;
  seccion:         string | null;
  curso:           string | null;
  cantRespuestas:  number;
  ultimaRespuesta: string | null;
}

export interface RespuestaDocente {
  id:            number;
  cuerpo:        string;
  fecha:         string;
  nombreAutor:   string;
  esMaestro:     boolean;
  transcripcion?: string;
  sentimiento?:   string;
  analisisCausa?: string;
  isPlaying?:     boolean;
  audioProgress?: number;
  currentTime?:   number;
  duration?:      number;
}

export interface MensajeDetalleDocente extends MensajeResumenDocente {
  cuerpo:              string;
  respuestas:          RespuestaDocente[];
  iniciadoPorDocente:  boolean;
  transcripcion?:      string;
  sentimiento?:        string;
  analisisCausa?:      string;
  isPlaying?:          boolean;
  audioProgress?:      number;
  currentTime?:        number;
  duration?:           number;
}

export interface AlumnoContexto {
  idAlumno:        number;
  nombre:          string;
  apellido:        string;
  grado:           string;
  seccion:         string;
  curso:           string;
  nombrePadre:     string;
  emailPadre:      string;
  totalClases:     number;
  clasesPresente:  number;
  tareasPendientes: number;
  promedio:        number;
}

export interface AlumnoDisponible {
  idAlumno:     number;
  nombreAlumno: string;
  grado:        string;
  seccion:      string;
  idPadre:      number;
  nombrePadre:  string;
  emailPadre:   string;
  idAulaCurso:  number;
  curso:        string;
}

// ── Detalle de Curso ─────────────────────────────────────────────

/** Material didáctico (Semana/Clase) */
export interface MaterialDocente {
  id:            number;
  semana:        number;
  clase:         number;
  titulo:        string;
  tipo:          string;         // 'pdf' | 'word' | 'video' | 'url' | 'youtube'
  url:           string | null;
  fechaCreacion: string;         // "DD/MM/YYYY"
}

export interface ClaseNodoDocente {
  clase: number;
  items: MaterialDocente[];
}

export interface SemanaNodoDocente {
  semana:  number;
  clases:  ClaseNodoDocente[];
}

export interface FormMaterial {
  semana:  number;
  clase:   number;
  titulo:  string;
  tipo:    string;   // 'pdf' | 'word' | 'video' | 'url' | 'youtube'
  url:     string;
  file?:   File | null;
}

/** Tarea con estadísticas de entrega */
export interface TareaDocente {
  id:             number;
  numeroTarea:    number;
  semana:         number;
  clase:          number;
  titulo:         string;
  descripcion:    string | null;
  tipoEntregable: string | null;
  fechaEntrega:   string | null;  // "DD/MM/YYYY"
  notaMaxima:     number;
  intentos:       number;
  url:            string | null;
  fechaCreacion:  string;
  totalAlumnos:   number;
  entregadas:     number;
  noEntregadas:   number;
}

export interface NotaTarea {
  idNota:    number;
  idAlumno:  number;
  codigo:    string;
  nombres:   string;
  entregado: boolean;
  nota:      number | null;
}

export interface FormTarea {
  semana:         number;
  clase:          number;
  numeroTarea:    number;
  titulo:         string;
  descripcion:    string;
  tipoEntregable: string;
  fechaEntrega:   string;   // 'YYYY-MM-DD'
  notaMaxima:     number;
  intentos:       number;
  url:            string;
}

/** Examen con estadísticas de rendimiento */
export interface ExamenDocente {
  id:             number;
  numeroExamen:   number;
  semana:         number;
  clase:          number;
  titulo:         string;
  descripcion:    string | null;
  tipo:           string;              // escrito | oral | online | practico
  fechaExamen:    string | null;
  duracionMinutos: number | null;
  notaMaxima:     number;
  url:            string | null;
  fechaCreacion:  string;
  totalAlumnos:   number;
  asistieron:     number;
  noAsistieron:   number;
  calificados:    number;
}

export interface NotaExamen {
  idNotaExamen: number;
  idAlumno:     number;
  codigo:       string;
  nombres:      string;
  asistio:      boolean;
  nota:         number | null;
}

export interface FormExamen {
  semana:          number;
  clase:           number;
  numeroExamen:    number;
  titulo:          string;
  descripcion:     string;
  tipo:            string;
  fechaExamen:     string;
  duracionMinutos: number;
  notaMaxima:      number;
  url:             string;
}

/** Unidad del temario */
export interface UnidadDocente {
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

export interface FormUnidad {
  idUnidad?:   number;
  numero:      number;
  titulo:      string;
  bimestre:    string;
  semanas:     string;
  objetivos:   string;
  indicadores: string;
  contenidos:  string;
  estado:      'pendiente' | 'en_curso' | 'concluido';
}

/** Reporte conductual de un alumno */
export interface ReporteDocente {
  id:            number;
  tipo:          string;         // pendiente | anotacion | llamada_atencion | felicitacion | otro
  titulo:        string;
  descripcion:   string | null;
  fecha:         string;
  visiblePadre:  boolean;
  fechaCreacion: string;
}

export interface AlumnoReportes {
  idAlumno:     number;
  codigo:       string;
  nombres:      string;
  totalReportes: number;
  reportes:     ReporteDocente[];
}

export interface FormReporte {
  idAlumno:     number | null;
  tipo:         string;
  titulo:       string;
  descripcion:  string;
  fecha:        string;
  visiblePadre: boolean;
}

/** Asistencia de un alumno en una sesión */
export interface AsistenciaAlumnoDocente {
  idAsistencia: number | null;
  idAlumno:     number;
  codigo:       string;
  nombres:      string;
  estado:       string;    // presente | falta | tardanza | justificado
  justificante: string | null;
}

export interface AlumnoConsolidado {
  idAlumno:              number;
  codigo:                string;
  nombres:               string;
  alertaRiesgo:          boolean;
  porcentajeAsistencia:  number;
  estados:               string[];
}

export interface ConsolidadoMensual {
  fechas:  string[];
  alumnos: AlumnoConsolidado[];
}

export interface SesionAsistencia {
  fecha:             string;
  totalPresentes:    number;
  totalFaltas:       number;
  totalTardanzas:    number;
  totalJustificados: number;
  alumnos:           AsistenciaAlumnoDocente[];
}

// ── Comunicados / Refuerzos ───────────────────────────────────────
export interface AulaSimple {
  id:      number;
  grado:   string;
  seccion: string;
}

export interface TipoEvento {
  id:          number;
  nombre:      string;
  colorFondo:  string;
  colorTexto:  string;
}

export interface ComunicadoDocente {
  id:            number;
  titulo:        string;
  descripcion:   string | null;
  tipo:          string;
  fechaEvento:   string | null;   // "DD/MM/YYYY"
  horaEvento:    string | null;   // "HH:MM"
  fechaCreacion: string;          // "DD/MM/YYYY HH:MM"
  grado:         string;          // primer grado o "Todos los grados"
  seccion:       string | null;
  idAula:        number | null;
  idAulas:       number[];        // lista de aulas destino
}

export interface FormComunicado {
  titulo:            string;
  tipo:              string;
  idAulas:           number[];    // vacío = todos los grados
  descripcion:       string;
  fechaEvento:       string;      // "YYYY-MM-DD"
  horaEvento:        string;      // "HH:MM"
  nuevoTipo:         string;      // nombre del tipo personalizado (si aplica)
  mostrarNuevoTipo:  boolean;
}
