-- =============================================================
-- MIGRACIÓN: Módulo Caja y Análisis
-- Portal Académico San Agustín Campus
-- =============================================================

-- Categorías de gastos / ingresos
CREATE TABLE IF NOT EXISTS categorias_caja (
    id_categoria  SERIAL PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL,
    tipo          VARCHAR(10)  NOT NULL CHECK (tipo IN ('ingreso','gasto')),
    descripcion   VARCHAR(255),
    activo        BOOLEAN NOT NULL DEFAULT true,
    creado_en     TIMESTAMP DEFAULT now()
);

-- Movimientos de caja (ingresos y gastos operativos)
CREATE TABLE IF NOT EXISTS movimientos_caja (
    id_movimiento SERIAL PRIMARY KEY,
    tipo          VARCHAR(10)  NOT NULL CHECK (tipo IN ('ingreso','gasto')),
    id_categoria  INTEGER REFERENCES categorias_caja(id_categoria),
    descripcion   VARCHAR(255) NOT NULL,
    monto         NUMERIC(12,2) NOT NULL,
    fecha         DATE         NOT NULL DEFAULT CURRENT_DATE,
    referencia    VARCHAR(100),
    registrado_en TIMESTAMP DEFAULT now()
);

-- Presupuestos mensuales por categoría
CREATE TABLE IF NOT EXISTS presupuestos_caja (
    id_presupuesto SERIAL PRIMARY KEY,
    id_categoria   INTEGER REFERENCES categorias_caja(id_categoria),
    anio           INTEGER NOT NULL,
    mes            INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    monto_objetivo NUMERIC(12,2) NOT NULL,
    UNIQUE (id_categoria, anio, mes)
);

-- ── SEMILLA ──────────────────────────────────────────────────

INSERT INTO categorias_caja (nombre, tipo, descripcion) VALUES
  ('Pensiones',          'ingreso', 'Cobro mensual de pensiones escolares'),
  ('Matrículas',         'ingreso', 'Cobro de matrículas por año escolar'),
  ('Otros Ingresos',     'ingreso', 'Donaciones y actividades escolares'),
  ('Planilla Docentes',  'gasto',   'Sueldos y beneficios del personal docente'),
  ('Mantenimiento',      'gasto',   'Mantenimiento de infraestructura y equipos'),
  ('Servicios Básicos',  'gasto',   'Agua, luz, internet y telefonía'),
  ('Material Educativo', 'gasto',   'Libros, útiles y material pedagógico'),
  ('Limpieza',           'gasto',   'Personal y suministros de limpieza')
ON CONFLICT DO NOTHING;

-- Movimientos del primer semestre 2026
INSERT INTO movimientos_caja (tipo, id_categoria, descripcion, monto, fecha) VALUES
  ('ingreso', 1, 'Pensiones Enero 2026',        4500.00, '2026-01-05'),
  ('ingreso', 1, 'Pensiones Febrero 2026',       4650.00, '2026-02-05'),
  ('ingreso', 1, 'Pensiones Marzo 2026',         4700.00, '2026-03-05'),
  ('ingreso', 1, 'Pensiones Abril 2026',         4750.00, '2026-04-05'),
  ('ingreso', 1, 'Pensiones Mayo 2026',          4800.00, '2026-05-05'),
  ('ingreso', 1, 'Pensiones Junio 2026',         4850.00, '2026-06-05'),
  ('ingreso', 2, 'Matrícula 2026',              12000.00, '2026-01-10'),
  ('gasto',   4, 'Planilla Enero 2026',          3200.00, '2026-01-28'),
  ('gasto',   4, 'Planilla Febrero 2026',        3200.00, '2026-02-28'),
  ('gasto',   4, 'Planilla Marzo 2026',          3250.00, '2026-03-28'),
  ('gasto',   4, 'Planilla Abril 2026',          3250.00, '2026-04-28'),
  ('gasto',   4, 'Planilla Mayo 2026',           3300.00, '2026-05-28'),
  ('gasto',   4, 'Planilla Junio 2026',          3300.00, '2026-06-28'),
  ('gasto',   5, 'Reparación Laboratorio',        850.00, '2026-03-15'),
  ('gasto',   6, 'Servicios Básicos Q1',          450.00, '2026-03-31'),
  ('gasto',   6, 'Servicios Básicos Q2',          470.00, '2026-06-30'),
  ('gasto',   7, 'Libros y material 2026',       1200.00, '2026-01-20'),
  ('gasto',   8, 'Limpieza Enero-Junio',          600.00, '2026-06-30')
ON CONFLICT DO NOTHING;

-- Presupuestos mensuales 2026 para categorías de gasto principales
INSERT INTO presupuestos_caja (id_categoria, anio, mes, monto_objetivo) VALUES
  (4, 2026, 1, 3200), (4, 2026, 2, 3200), (4, 2026, 3, 3250),
  (4, 2026, 4, 3250), (4, 2026, 5, 3300), (4, 2026, 6, 3300),
  (5, 2026, 1,  500), (5, 2026, 2,  500), (5, 2026, 3,  900),
  (5, 2026, 4,  500), (5, 2026, 5,  500), (5, 2026, 6,  500),
  (6, 2026, 1,  150), (6, 2026, 2,  150), (6, 2026, 3,  150),
  (6, 2026, 4,  150), (6, 2026, 5,  150), (6, 2026, 6,  150)
ON CONFLICT DO NOTHING;
