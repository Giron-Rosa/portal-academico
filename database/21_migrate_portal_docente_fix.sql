-- ============================================================
-- MIGRACIÓN: Tablas y columnas faltantes para el Portal Docente
-- Aplicar en: portal_academico (PostgreSQL)
-- ============================================================

-- 1. Columna iniciado_por_maestro en mensajes (si no existe)
ALTER TABLE mensajes
    ADD COLUMN IF NOT EXISTS iniciado_por_maestro BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Tabla tipos_evento (para comunicados categorizados)
CREATE TABLE IF NOT EXISTS tipos_evento (
    id_tipo      SERIAL PRIMARY KEY,
    nombre       VARCHAR(80)  NOT NULL,
    color_fondo  VARCHAR(20)  NOT NULL DEFAULT '#e2e8f0',
    color_texto  VARCHAR(20)  NOT NULL DEFAULT '#1e293b',
    activo       BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Seeds básicos de tipos de evento
INSERT INTO tipos_evento (nombre, color_fondo, color_texto) VALUES
    ('Reunión de Padres',   '#dbeafe', '#1d4ed8'),
    ('Actividad Escolar',   '#dcfce7', '#15803d'),
    ('Comunicado General',  '#fef9c3', '#854d0e'),
    ('Examen',              '#fee2e2', '#b91c1c'),
    ('Entrega de Notas',    '#f3e8ff', '#7e22ce'),
    ('Otros',               '#e2e8f0', '#334155')
ON CONFLICT DO NOTHING;

-- 3. Tabla comunicado_aulas (relación muchos-a-muchos entre comunicados y aulas)
CREATE TABLE IF NOT EXISTS comunicado_aulas (
    id_comunicado INT NOT NULL REFERENCES comunicados(id_comunicado) ON DELETE CASCADE,
    id_aula       INT NOT NULL REFERENCES aulas(id_aula) ON DELETE CASCADE,
    PRIMARY KEY (id_comunicado, id_aula)
);

-- Poblar comunicado_aulas a partir del id_aula existente en comunicados
INSERT INTO comunicado_aulas (id_comunicado, id_aula)
SELECT id_comunicado, id_aula
FROM   comunicados
WHERE  id_aula IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Añadir columna id_tipo_evento a comunicados (FK a tipos_evento)
ALTER TABLE comunicados
    ADD COLUMN IF NOT EXISTS id_tipo_evento INT REFERENCES tipos_evento(id_tipo) ON DELETE SET NULL;

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================
