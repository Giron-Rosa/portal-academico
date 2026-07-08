// ===================================================================
// shared/models/common.models.ts
// Modelos compartidos entre varios portales
// ===================================================================

// ── Notificaciones WebSocket ──────────────────────────────────────
/** Payload que emite el backend por /topic/notificaciones/{codigo} */
export interface NotificacionAcademicaWs {
  tipo:   string;   // 'TAREA' | 'EXAMEN' | 'MATERIAL' | 'NOTA'
  titulo: string;
  cuerpo: string;
  fecha:  string;   // ISO timestamp
}

// ── Autenticación / Usuario ───────────────────────────────────────
export type RolUsuario = 'alumno' | 'docente' | 'padre' | 'admin';

export interface UsuarioAuth {
  codigo:   string;
  nombre:   string;
  rol:      RolUsuario;
  token:    string;
}

// ── Comunicado / Evento Institucional ────────────────────────────
/** Comunicado que puede verse en portal alumno, padre y docente */
export interface ComunicadoComun {
  id:            number;
  titulo:        string;
  descripcion:   string | null;
  tipo:          string;
  fechaEvento:   string | null;
  horaEvento:    string | null;
  fechaCreacion: string;
  docente:       string;
}

// ── Paginación genérica ───────────────────────────────────────────
export interface PaginaRespuesta<T> {
  contenido:    T[];
  totalPaginas: number;
  paginaActual: number;
  totalItems:   number;
}

// ── Respuesta genérica de la API ──────────────────────────────────
export interface ApiRespuesta<T = void> {
  mensaje: string;
  data:    T;
}

// ── Horario semanal (alumno y docente comparten la misma forma) ───
export interface BloqueHorario {
  dia:        number;       // 1=Lunes … 5=Viernes
  diaNombre:  string;
  horaInicio: string;       // "HH:mm"
  horaFin:    string;       // "HH:mm"
  curso:      string;
  grado:      string;
  seccion:    string;
  idAulaCurso?: number;
}
