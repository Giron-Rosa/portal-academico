// ===================================================================
// shared/models/padre.models.ts
// Modelos del Portal Padre
// ===================================================================

// ── Tipos de navegación ──────────────────────────────────────────
export type SeccionPadre =
  | 'inicio' | 'cursos' | 'asistencia'
  | 'mensajes' | 'eventos' | 'pagos' | 'metas';

export type VistaPadre = 'dashboard' | 'detalle';
export type EstadoAlumno = 'bueno' | 'observacion' | 'riesgo';

// ── Hijo / Estudiante ────────────────────────────────────────────
export interface CursoResumenHijo {
  nombre:   string;
  progreso: number;
}

export interface CursoDetalle {
  nombre: string;
  progreso: number;
  tareasEntregadas: number;
  totalTareas: number;
  puntualidad: number;
  docente?: string;
  promedioCurso: number;
}

export interface Hijo {
  id:               number;
  nombre:           string;
  grado:            string;
  codigo:           string;
  estado:           EstadoAlumno;
  promedio:         number;
  asistencia:       number;
  cursosRiesgo:     number;
  entregaTareas:    number;
  cuotasPendientes: number;
  descripcion:      string;
  cursosMonitor:    CursoResumenHijo[];
  cursos:           CursoDetalle[];
  eventos:          string[];
  parentesco?:      string;
}

/** Shape raw del endpoint de hijos */
export interface HijoApi {
  nombre:           string;
  apellido:         string;
  codigo:           string;
  grado:            string;
  seccion:          string;
  turno:            string;
  periodo:          string;
  parentesco:       string;
  promedio:         number;
  asistencia:       number;
  cursosRiesgo:     number;
  entregaTareas:    number;
  estado:           EstadoAlumno;
  cuotasPendientes: number;
  cursos:           CursoDetalleHijoApi[];
}

export interface CursoDetalleHijoApi {
  nombre:           string;
  area:             string;
  horasSemana:      number;
  docente:          string;
  progreso:         number;
  tareasEntregadas: number;
  totalTareas:      number;
  promedioCurso:    number;
  asistenciaCurso:  number;
}

// ── Mensajería ───────────────────────────────────────────────────
export interface MensajeResumenPadre {
  id:              number;
  asunto:          string;
  tipo:            string;
  leido:           boolean;
  fechaEnvio:      string;
  nombrePadre:     string;   // docente en el portal de padres
  nombreAlumno:    string;
  idAlumno:        number;
  grado:           string;
  seccion:         string;
  curso:           string;
  cantRespuestas:  number;
  ultimaRespuesta: string;
}

export interface RespuestaPadre {
  id:            number;
  cuerpo:        string;
  fecha:         string;
  autor:         string;
  esMaestro:     boolean;
  transcripcion?: string;
  sentimiento?:  string;
  analisisCausa?: string;
  isPlaying?:    boolean;
  audioProgress?: number;
  currentTime?:  number;
  duration?:     number;
}

export interface MensajeDetallePadre {
  id:                 number;
  asunto:             string;
  tipo:               string;
  leido:              boolean;
  fechaEnvio:         string;
  nombrePadre:        string;
  nombreAlumno:       string;
  idAlumno:           number;
  grado:              string;
  seccion:            string;
  curso:              string;
  cuerpo:             string;
  respuestas:         RespuestaPadre[];
  iniciadoPorDocente: boolean;
  transcripcion?:     string;
  sentimiento?:       string;
  analisisCausa?:     string;
  isPlaying?:         boolean;
  audioProgress?:     number;
  currentTime?:       number;
  duration?:          number;
}

export interface DocenteDisponible {
  idMaestro:     number;
  nombreMaestro: string;
  curso:         string;
  nombreAlumno:  string;
  idAlumno:      number;
  idAulaCurso:   number;
}

// ── Cursos del hijo ───────────────────────────────────────────────
export interface TareaHijo {
  idTarea:      number;
  titulo:       string;
  fechaEntrega: string;
  entregado:    boolean;
  nota:         number | null;
  notaMaxima:   number;
}

export interface ExamenHijo {
  idExamen:   number;
  titulo:     string;
  tipo:       string;
  fechaExamen: string;
  asistio:    boolean;
  nota:       number | null;
  notaMaxima: number;
}

export interface CursoDetalleCompleto {
  nombre:           string;
  area:             string;
  docente:          string;
  progreso:         number;
  tareasEntregadas: number;
  totalTareas:      number;
  promedioCurso:    number;
  asistenciaCurso:  number;
  tareas:           TareaHijo[];
  examenes:         ExamenHijo[];
}

// ── Asistencia ────────────────────────────────────────────────────
export interface AsistenciaRegistroPadre {
  fecha:        string;
  estado:       string;
  curso:        string;
  justificante: string;
}

export interface AsistenciaDetalleCompleto {
  historial:   AsistenciaRegistroPadre[];
  total:       number;
  presente:    number;
  tardanza:    number;
  falta:       number;
  justificado: number;
  porcentaje:  number;
}

// ── Eventos y Pagos ───────────────────────────────────────────────
export interface EventoHijo {
  id:            number;
  titulo:        string;
  descripcion:   string;
  tipo:          string;
  fechaEvento:   string;
  horaEvento:    string;
  fechaCreacion: string;
  docente:       string;
}

export interface PagoHijo {
  concepto:         string;
  monto:            number;
  fechaVencimiento: string;
  estado:           string;   // 'PAGADO', 'PENDIENTE', 'VENCIDO'
  fechaPago:        string | null;
  documento:        string | null;
}

// ── Gamificación ──────────────────────────────────────────────────
export interface MisionDto {
  nombre:      string;
  descripcion: string;
  completada:  boolean;
  progreso:    number;
  meta:        number;
  puntos:      number;
}

export interface InsigniaDto {
  nombre:        string;
  descripcion:   string;
  icono:         string;
  desbloqueada:  boolean;
  fechaObtenida: string | null;
}

export interface GamificacionHijo {
  misiones:  MisionDto[];
  insignias: InsigniaDto[];
}
