-- =============================================================
-- MIGRACIÓN: Eventos Institucionales
-- Portal Académico San Agustín Campus
-- =============================================================

CREATE TABLE IF NOT EXISTS eventos_institucionales (
    id_evento     SERIAL PRIMARY KEY,
    tipo          VARCHAR(50) NOT NULL, -- 'reunion', 'academico', 'feriado', 'administrativo', 'otro'
    titulo        VARCHAR(200) NOT NULL,
    fecha         DATE NOT NULL,
    hora_inicio   TIME NOT NULL,
    hora_fin      TIME NOT NULL,
    lugar         VARCHAR(200),
    descripcion   TEXT,
    creado_por    VARCHAR(100),
    creado_en     TIMESTAMP DEFAULT now(),
    CONSTRAINT ck_evento_horas CHECK (hora_fin > hora_inicio)
);

-- Semillas
INSERT INTO eventos_institucionales (tipo, titulo, fecha, hora_inicio, hora_fin, lugar, descripcion, creado_por) VALUES
  ('academico', 'Inicio de Clases - I Bimestre', '2026-03-09', '07:30:00', '14:00:00', 'Aulas de Clase', 'Inicio formal del año lectivo 2026', 'ADMIN'),
  ('reunion', 'Primera Reunión General de Padres de Familia', '2026-03-13', '18:00:00', '20:00:00', 'Auditorio Principal', 'Coordinación de lineamientos del año escolar', 'ADMIN'),
  ('feriado', 'Feriado Semana Santa (Jueves Santo)', '2026-04-02', '00:00:00', '23:59:59', 'Todo el Colegio', 'Feriado nacional no laborable', 'ADMIN'),
  ('feriado', 'Feriado Semana Santa (Viernes Santo)', '2026-04-03', '00:00:00', '23:59:59', 'Todo el Colegio', 'Feriado nacional no laborable', 'ADMIN'),
  ('administrativo', 'Junta de Profesores - Evaluación I Bimestre', '2026-05-15', '14:30:00', '17:30:00', 'Sala de Profesores', 'Análisis de rendimiento académico', 'ADMIN'),
  ('otro', 'Día del Maestro - Celebración Institucional', '2026-07-06', '08:00:00', '13:00:00', 'Patio Central', 'Homenaje a los docentes del colegio', 'ADMIN')
ON CONFLICT DO NOTHING;
