-- ============================================================
-- MIGRACIÓN: tareas_curso + notas_tarea + seed
-- ============================================================

CREATE TABLE IF NOT EXISTS tareas_curso (
    id_tarea        SERIAL       PRIMARY KEY,
    id_aula_curso   INT          NOT NULL REFERENCES aula_cursos(id_aula_curso) ON DELETE CASCADE,
    numero_tarea    SMALLINT     NOT NULL DEFAULT 1,
    semana          SMALLINT     NOT NULL DEFAULT 1,
    clase           SMALLINT     NOT NULL DEFAULT 1,
    titulo          VARCHAR(200) NOT NULL,
    descripcion     TEXT,
    tipo_entregable VARCHAR(100),
    fecha_entrega   DATE,
    nota_maxima     SMALLINT     NOT NULL DEFAULT 20,
    intentos        SMALLINT     NOT NULL DEFAULT 1,
    url             TEXT,
    fecha_creacion  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notas_tarea (
    id_nota     SERIAL       PRIMARY KEY,
    id_tarea    INT          NOT NULL REFERENCES tareas_curso(id_tarea) ON DELETE CASCADE,
    id_alumno   INT          NOT NULL REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
    nota        DECIMAL(4,1),        -- NULL hasta calificar
    entregado   BOOLEAN      NOT NULL DEFAULT FALSE,
    UNIQUE (id_tarea, id_alumno)
);

-- Seed data solo si está vacío
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM tareas_curso LIMIT 1) THEN

    -- ── 5to Sec B  (id_aula_curso = 1) ──────────────────────
    INSERT INTO tareas_curso (id_aula_curso, numero_tarea, semana, clase, titulo, descripcion, tipo_entregable, fecha_entrega, nota_maxima, intentos, fecha_creacion)
    VALUES
      (1, 1, 1, 1, 'Ejercicio: Números Enteros',
       'Resolver los ejercicios del 1 al 20 del libro de trabajo. Mostrar el procedimiento completo.',
       'Hoja de trabajo escaneada o foto clara', CURRENT_DATE + 7,  20, 1, NOW() - INTERVAL '18 days'),
      (1, 2, 2, 1, 'Práctica: Operaciones con Decimales',
       'Completar la guía de decimales entregada en clase. Incluye suma, resta, multiplicación y división.',
       'Guía resuelta (foto o PDF)', CURRENT_DATE + 10, 20, 2, NOW() - INTERVAL '10 days'),
      (1, 3, 3, 1, 'Evaluación: Fracciones',
       'Resolver el set de 15 problemas de fracciones equivalentes y operaciones.',
       'Evaluación resuelta en hoja bond', CURRENT_DATE + 14, 20, 1, NOW() - INTERVAL '5 days');

    -- notas para tarea 1 (alumno Juan → aula 1)
    INSERT INTO notas_tarea (id_tarea, id_alumno, nota, entregado)
    SELECT t.id_tarea, m.id_alumno, NULL, FALSE
    FROM tareas_curso t
    JOIN aula_cursos ac ON ac.id_aula_curso = t.id_aula_curso
    JOIN matriculas  m  ON m.id_aula = ac.id_aula AND m.estado = 'activa'
    WHERE t.id_aula_curso = 1
    ON CONFLICT DO NOTHING;

    -- marcar tarea 1 como entregada y calificada para Juan
    UPDATE notas_tarea nt
    SET entregado = TRUE, nota = 16.0
    FROM tareas_curso t
    WHERE nt.id_tarea = t.id_tarea
      AND t.id_aula_curso = 1 AND t.numero_tarea = 1
      AND nt.id_alumno = 1;

    -- ── 3ro Sec A  (id_aula_curso = 9) ──────────────────────
    INSERT INTO tareas_curso (id_aula_curso, numero_tarea, semana, clase, titulo, descripcion, tipo_entregable, fecha_entrega, nota_maxima, intentos, fecha_creacion)
    VALUES
      (9, 1, 1, 1, 'Ejercicio: Expresiones Algebraicas',
       'Simplificar las 10 expresiones algebraicas de la hoja de práctica.',
       'Hoja resuelta (foto o PDF)', CURRENT_DATE + 7, 20, 1, NOW() - INTERVAL '18 days'),
      (9, 2, 1, 2, 'Práctica: Ecuaciones de Primer Grado',
       'Resolver las ecuaciones 1-15 del libro, mostrando verificación.',
       'Hoja resuelta escaneada', CURRENT_DATE + 12, 20, 2, NOW() - INTERVAL '8 days');

    -- notas para tareas de 3ro Sec A (alumno Sofía → aula 2)
    INSERT INTO notas_tarea (id_tarea, id_alumno, nota, entregado)
    SELECT t.id_tarea, m.id_alumno, NULL, FALSE
    FROM tareas_curso t
    JOIN aula_cursos ac ON ac.id_aula_curso = t.id_aula_curso
    JOIN matriculas  m  ON m.id_aula = ac.id_aula AND m.estado = 'activa'
    WHERE t.id_aula_curso = 9
    ON CONFLICT DO NOTHING;

  END IF;
END $$;
