-- =============================================================
-- MIGRACIÓN: Configuración de Colegio, Año Escolar y Roles
-- Portal Académico San Agustín Campus
-- =============================================================

-- Datos institucionales del colegio
CREATE TABLE IF NOT EXISTS colegio_config (
    id_config     SERIAL PRIMARY KEY,
    nombre        VARCHAR(200) NOT NULL,
    ruc           VARCHAR(20),
    direccion     VARCHAR(300),
    telefono      VARCHAR(30),
    email         VARCHAR(150),
    logo_url      VARCHAR(500),
    ciudad        VARCHAR(100),
    distrito      VARCHAR(100),
    nivel         VARCHAR(100) DEFAULT 'Inicial, Primaria y Secundaria',
    director      VARCHAR(150),
    mision        TEXT,
    vision        TEXT,
    actualizado_en TIMESTAMP DEFAULT now()
);

-- Años escolares
CREATE TABLE IF NOT EXISTS anos_escolares (
    id_ano        SERIAL PRIMARY KEY,
    nombre        VARCHAR(50)  NOT NULL,
    fecha_inicio  DATE         NOT NULL,
    fecha_fin     DATE         NOT NULL,
    activo        BOOLEAN NOT NULL DEFAULT false,
    creado_en     TIMESTAMP DEFAULT now()
);

-- Módulos del sistema (para la matriz de permisos)
CREATE TABLE IF NOT EXISTS modulos_sistema (
    id_modulo  SERIAL PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    descripcion VARCHAR(200),
    icono      VARCHAR(50)
);

-- Roles del sistema
CREATE TABLE IF NOT EXISTS roles_sistema (
    id_rol     SERIAL PRIMARY KEY,
    nombre     VARCHAR(50)  NOT NULL UNIQUE,
    descripcion VARCHAR(200)
);

-- Matriz de permisos: rol ↔ módulo
CREATE TABLE IF NOT EXISTS permisos_rol_modulo (
    id_permiso SERIAL PRIMARY KEY,
    id_rol     INTEGER REFERENCES roles_sistema(id_rol)   ON DELETE CASCADE,
    id_modulo  INTEGER REFERENCES modulos_sistema(id_modulo) ON DELETE CASCADE,
    puede_ver    BOOLEAN NOT NULL DEFAULT false,
    puede_crear  BOOLEAN NOT NULL DEFAULT false,
    puede_editar BOOLEAN NOT NULL DEFAULT false,
    puede_borrar BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (id_rol, id_modulo)
);

-- ── SEMILLA ──────────────────────────────────────────────────

INSERT INTO colegio_config (nombre, ruc, direccion, telefono, email, ciudad, distrito, nivel, director, mision, vision)
VALUES (
    'Institución Educativa San Agustín Campus',
    '20512345678',
    'Av. San Agustín 1250, Lima',
    '(01) 555-1234',
    'contacto@sanagustincampus.edu.pe',
    'Lima',
    'San Isidro',
    'Inicial, Primaria y Secundaria',
    'Mg. Carlos Rodríguez Vega',
    'Brindar una educación integral, innovadora y de calidad, formando personas con valores sólidos, pensamiento crítico y habilidades para el siglo XXI.',
    'Ser reconocidos como la institución educativa líder en Lima, referente de excelencia académica, convivencia inclusiva y formación en valores.'
) ON CONFLICT DO NOTHING;

INSERT INTO anos_escolares (nombre, fecha_inicio, fecha_fin, activo) VALUES
  ('Año Escolar 2024', '2024-03-11', '2024-12-20', false),
  ('Año Escolar 2025', '2025-03-10', '2025-12-19', false),
  ('Año Escolar 2026', '2026-03-09', '2026-12-18', true)
ON CONFLICT DO NOTHING;

INSERT INTO modulos_sistema (nombre, descripcion, icono) VALUES
  ('Dashboard',        'Panel principal con KPIs',                  'grid'),
  ('Estudiantes',      'Gestión de matrícula y datos del alumno',   'users'),
  ('Docentes',         'Gestión del personal docente',              'book-open'),
  ('Apoderados',       'Gestión de padres/tutores',                 'user-check'),
  ('Finanzas',         'Conceptos de pago y cobranza',             'dollar-sign'),
  ('Caja y Análisis',  'Movimientos e ingresos operativos',        'activity'),
  ('Portal Docente',   'Calificaciones, tareas y asistencias',     'edit'),
  ('Portal Alumno',    'Notas, temario y asistencias del alumno',  'award'),
  ('Portal Padre',     'Seguimiento del hijo y mensajería',        'home'),
  ('Kanban Notas',     'Tablero de tareas internas del admin',     'columns'),
  ('Configuración',    'Datos institucionales y años escolares',   'settings')
ON CONFLICT DO NOTHING;

INSERT INTO roles_sistema (nombre, descripcion) VALUES
  ('ADMIN',    'Acceso total al sistema'),
  ('DOCENTE',  'Gestión académica: calificaciones, tareas y asistencias'),
  ('ALUMNO',   'Acceso al portal del estudiante'),
  ('PADRE',    'Acceso al portal del apoderado')
ON CONFLICT DO NOTHING;

-- Permisos para ADMIN: acceso total a todos los módulos
INSERT INTO permisos_rol_modulo (id_rol, id_modulo, puede_ver, puede_crear, puede_editar, puede_borrar)
SELECT r.id_rol, m.id_modulo, true, true, true, true
FROM roles_sistema r, modulos_sistema m
WHERE r.nombre = 'ADMIN'
ON CONFLICT DO NOTHING;

-- Permisos para DOCENTE
INSERT INTO permisos_rol_modulo (id_rol, id_modulo, puede_ver, puede_crear, puede_editar, puede_borrar)
SELECT r.id_rol, m.id_modulo,
       true,
       m.nombre IN ('Portal Docente'),
       m.nombre IN ('Portal Docente'),
       false
FROM roles_sistema r, modulos_sistema m
WHERE r.nombre = 'DOCENTE'
  AND m.nombre IN ('Portal Docente', 'Dashboard')
ON CONFLICT DO NOTHING;

-- Permisos para ALUMNO
INSERT INTO permisos_rol_modulo (id_rol, id_modulo, puede_ver, puede_crear, puede_editar, puede_borrar)
SELECT r.id_rol, m.id_modulo, true, false, false, false
FROM roles_sistema r, modulos_sistema m
WHERE r.nombre = 'ALUMNO'
  AND m.nombre IN ('Portal Alumno', 'Dashboard')
ON CONFLICT DO NOTHING;

-- Permisos para PADRE
INSERT INTO permisos_rol_modulo (id_rol, id_modulo, puede_ver, puede_crear, puede_editar, puede_borrar)
SELECT r.id_rol, m.id_modulo, true, false, false, false
FROM roles_sistema r, modulos_sistema m
WHERE r.nombre = 'PADRE'
  AND m.nombre IN ('Portal Padre', 'Dashboard')
ON CONFLICT DO NOTHING;
