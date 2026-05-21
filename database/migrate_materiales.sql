-- ============================================================
-- MIGRACIÓN: Agregar tabla materiales_curso + seed data
-- Ejecutar contra la DB ya existente (no rompe nada si se repite
-- gracias a IF NOT EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS materiales_curso (
    id_material    SERIAL       PRIMARY KEY,
    id_aula_curso  INT          NOT NULL REFERENCES aula_cursos(id_aula_curso) ON DELETE CASCADE,
    semana         SMALLINT     NOT NULL DEFAULT 1,
    clase          SMALLINT     NOT NULL DEFAULT 1,
    titulo         VARCHAR(200) NOT NULL,
    tipo           VARCHAR(20)  NOT NULL DEFAULT 'pdf',
    url            TEXT,
    fecha_creacion TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Seed data solo si la tabla está vacía
INSERT INTO materiales_curso (id_aula_curso, semana, clase, titulo, tipo, url, fecha_creacion)
SELECT * FROM (VALUES
    (1::int, 1::smallint, 1::smallint, 'Números enteros: concepto y clasificación',  'pdf',     NULL::text, NOW() - INTERVAL '20 days'),
    (1,      1,           1,           'Ejercicios de práctica N°1',                 'pdf',     NULL,       NOW() - INTERVAL '19 days'),
    (1,      1,           2,           'Video: Operaciones con enteros',             'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', NOW() - INTERVAL '18 days'),
    (1,      1,           2,           'Recurso interactivo - GeoGebra',             'url',     'https://www.geogebra.org', NOW() - INTERVAL '17 days'),
    (1,      2,           1,           'Decimales: concepto, tipos y escritura',     'pdf',     NULL,       NOW() - INTERVAL '13 days'),
    (1,      2,           1,           'Guía de trabajo: decimales',                 'word',    NULL,       NOW() - INTERVAL '12 days'),
    (1,      2,           2,           'Operaciones con decimales – suma y resta',   'pdf',     NULL,       NOW() - INTERVAL '11 days'),
    (1,      3,           1,           'Fracciones: concepto y tipos',               'pdf',     NULL,       NOW() - INTERVAL '6 days'),
    (1,      3,           1,           'Video: Fracciones equivalentes',             'youtube', 'https://www.youtube.com/watch?v=example1', NOW() - INTERVAL '5 days'),
    (9,      1,           1,           'Introducción al álgebra',                    'pdf',     NULL,       NOW() - INTERVAL '20 days'),
    (9,      1,           1,           'Ejercicios de expresiones algebraicas',      'pdf',     NULL,       NOW() - INTERVAL '19 days'),
    (9,      1,           2,           'Ecuaciones de primer grado',                 'pdf',     NULL,       NOW() - INTERVAL '17 days'),
    (9,      1,           2,           'Tutorial interactivo - ecuaciones',          'url',     'https://www.khanacademy.org', NOW() - INTERVAL '16 days'),
    (9,      2,           1,           'Sistemas de ecuaciones',                     'pdf',     NULL,       NOW() - INTERVAL '10 days'),
    (17,     1,           1,           'Números del 1 al 10',                        'pdf',     NULL,       NOW() - INTERVAL '20 days'),
    (17,     1,           1,           'Video: Contando con deditos',                'youtube', 'https://www.youtube.com/watch?v=example2', NOW() - INTERVAL '19 days'),
    (17,     1,           2,           'Suma y resta básica',                        'pdf',     NULL,       NOW() - INTERVAL '17 days')
) AS v(id_aula_curso, semana, clase, titulo, tipo, url, fecha_creacion)
WHERE NOT EXISTS (SELECT 1 FROM materiales_curso LIMIT 1);
