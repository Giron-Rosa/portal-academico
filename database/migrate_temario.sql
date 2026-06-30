-- ============================================================
-- MIGRACIÓN: Temario y Unidades Didácticas
-- ============================================================

-- Asegurar encoding UTF-8 para caracteres acentuados
SET client_encoding = 'UTF8';

CREATE TABLE IF NOT EXISTS unidades_didacticas (
    id_unidad     SERIAL PRIMARY KEY,
    id_aula_curso INT NOT NULL REFERENCES aula_cursos(id_aula_curso) ON DELETE CASCADE,
    numero        INT NOT NULL,
    titulo        VARCHAR(255) NOT NULL,
    bimestre      VARCHAR(30) NOT NULL,
    semanas       VARCHAR(50),
    objetivos     TEXT[] NOT NULL,
    indicadores   TEXT[] NOT NULL,
    contenidos    TEXT[] NOT NULL,
    estado        VARCHAR(30) NOT NULL DEFAULT 'pendiente', -- 'pendiente', 'en_curso', 'concluido'
    fecha_conclusion TIMESTAMP,
    UNIQUE (id_aula_curso, numero)
);

-- ============================================================
-- Semillas de Unidades Didácticas para todos los Cursos
-- ============================================================
DO $$
DECLARE
    rec RECORD;
BEGIN
    FOR rec IN SELECT id_aula_curso FROM aula_cursos LOOP
        -- Unidad 1: concluido
        INSERT INTO unidades_didacticas (id_aula_curso, numero, titulo, bimestre, semanas, objetivos, indicadores, contenidos, estado, fecha_conclusion)
        VALUES (
            rec.id_aula_curso,
            1,
            'Introducción y Fundamentos Clave',
            'Bimestre I',
            'Semanas 1-4',
            ARRAY['Comprender los conceptos teóricos iniciales', 'Identificar los componentes clave de la materia'],
            ARRAY['Describe correctamente los términos fundamentales', 'Resuelve ejercicios prácticos iniciales con precisión'],
            ARRAY['Teoría de sistemas y definiciones iniciales', 'Métodos cuantitativos y cualitativos aplicados'],
            'concluido',
            NOW() - INTERVAL '30 days'
        ) ON CONFLICT (id_aula_curso, numero) DO NOTHING;

        -- Unidad 2: en_curso
        INSERT INTO unidades_didacticas (id_aula_curso, numero, titulo, bimestre, semanas, objetivos, indicadores, contenidos, estado, fecha_conclusion)
        VALUES (
            rec.id_aula_curso,
            2,
            'Desarrollo Intermedio y Aplicaciones',
            'Bimestre II',
            'Semanas 5-8',
            ARRAY['Analizar casos de estudio aplicados', 'Formular hipótesis y resolver problemas intermedios'],
            ARRAY['Desarrolla modelos estructurados para problemas dados', 'Expone resultados con argumentos técnicos sólidos'],
            ARRAY['Diseño de soluciones lógicas avanzadas', 'Implementación de experimentos prácticos guiados'],
            'en_curso',
            NULL
        ) ON CONFLICT (id_aula_curso, numero) DO NOTHING;

        -- Unidad 3: pendiente
        INSERT INTO unidades_didacticas (id_aula_curso, numero, titulo, bimestre, semanas, objetivos, indicadores, contenidos, estado, fecha_conclusion)
        VALUES (
            rec.id_aula_curso,
            3,
            'Optimización y Proyectos Integrales',
            'Bimestre III',
            'Semanas 9-12',
            ARRAY['Diseñar un proyecto grupal integrado', 'Evaluar la eficiencia y escalabilidad de las soluciones'],
            ARRAY['Integra de manera efectiva múltiples tecnologías', 'Presenta reportes de optimización con métricas reales'],
            ARRAY['Conceptos de rendimiento y optimización', 'Gestión de proyectos y trabajo colaborativo'],
            'pendiente',
            NULL
        ) ON CONFLICT (id_aula_curso, numero) DO NOTHING;

        -- Unidad 4: pendiente
        INSERT INTO unidades_didacticas (id_aula_curso, numero, titulo, bimestre, semanas, objetivos, indicadores, contenidos, estado, fecha_conclusion)
        VALUES (
            rec.id_aula_curso,
            4,
            'Temas Avanzados y Tendencias del Futuro',
            'Bimestre IV',
            'Semanas 13-16',
            ARRAY['Investigar sobre tecnologías emergentes', 'Proponer soluciones innovadoras basadas en las tendencias'],
            ARRAY['Propone alternativas viables a problemas del mundo real', 'Demuestra visión crítica en la redacción técnica'],
            ARRAY['Tecnologías emergentes y futuro del sector', 'Presentación final de portafolios y proyectos'],
            'pendiente',
            NULL
        ) ON CONFLICT (id_aula_curso, numero) DO NOTHING;
    END LOOP;
END $$;
