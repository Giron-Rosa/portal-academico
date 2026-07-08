// ===================================================================
// shared/models/admin.models.ts
// Modelos del Portal Administrador
// ===================================================================

// ── Tipos de navegación ──────────────────────────────────────────
export type SeccionAdmin = 'dashboard' | 'estudiantes' | 'docentes' | 'padres' | 'kanban';

// ── Dashboard KPIs ────────────────────────────────────────────────
export interface KpisAdmin {
  totalEstudiantes: number;
  totalDocentes:    number;
  totalCursos:      number;
  morosidadPct:     number;
}

// ── CRUD Estudiantes ──────────────────────────────────────────────
export interface EstudianteAdmin {
  idAlumno: number;
  codigo:   string;
  nombre:   string;
  apellido: string;
  grado:    string;
  seccion:  string;
  email:    string;
  estado:   string;
}

export interface GuardarEstudianteRequest {
  nombre:   string;
  apellido: string;
  grado:    string;
  seccion:  string;
  email:    string;
  dni:      string;
  turno:    string;
}

// ── CRUD Docentes ─────────────────────────────────────────────────
export interface DocenteAdmin {
  idMaestro:     number;
  codigo:        string;
  nombre:        string;
  apellido:      string;
  especialidad:  string;
  email:         string;
  departamento:  string;
  activo:        boolean;
}

export interface GuardarDocenteRequest {
  nombre:       string;
  apellido:     string;
  especialidad: string;
  email:        string;
  dni:          string;
  departamento: string;
}

// ── CRUD Padres ───────────────────────────────────────────────────
export interface PadreAdmin {
  idPadre:        number;
  codigo:         string;
  nombre:         string;
  apellido:       string;
  email:          string;
  telefono:       string;
  dni:            string;
  hijosVinculados: string;
}

export interface GuardarPadreRequest {
  nombre:   string;
  apellido: string;
  email:    string;
  dni:      string;
  telefono: string;
}

// ── Kanban de Notas Internas ─────────────────────────────────────
export interface NotaKanban {
  idNota?:     number;
  titulo:      string;
  descripcion: string;
  prioridad:   'alta' | 'media' | 'baja';
  estado:      'pendiente' | 'en_progreso' | 'completada';
  responsable: string;
  fechaLimite: string;
  etiquetas:   string;
}

// ── IA / Análisis ─────────────────────────────────────────────────
export interface AlertaEfectividad {
  tipo:        string;
  descripcion: string;
  nivel:       string;  // 'critico' | 'alerta' | 'info'
}

export interface TutorScore {
  idMaestro: number;
  nombre:    string;
  score:     number;
  tendencia: number;
}
