-- ============================================================
-- MIGRACIÓN: examenes_curso + notas_examen + seed
-- ============================================================

CREATE TABLE IF NOT EXISTS examenes_curso (
    id_examen          SERIAL       PRIMARY KEY,
    id_aula_curso      INT          NOT NULL REFERENCES aula_cursos(id_aula_curso) ON DELETE CASCADE,
    numero_examen      SMALLINT     NOT NULL DEFAULT 1,
    semana             SMALLINT     NOT NULL DEFAULT 1,
    clase              SMALLINT     NOT NULL DEFAULT 1,
    titulo             VARCHAR(200) NOT NULL,
    descripcion        TEXT,
    tipo               VARCHAR(50)  NOT NULL DEFAULT 'escrito',  -- escrito | oral | online | practico
    fecha_examen       DATE,
    duracion_minutos   SMALLINT,
    nota_maxima        SMALLINT     NOT NULL DEFAULT 20,
    url                TEXT,
    fecha_creacion     TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notas_examen (
    id_nota_examen  SERIAL       PRIMARY KEY,
    id_examen       INT          NOT NULL REFERENCES examenes_curso(id_examen) ON DELETE CASCADE,
    id_alumno       INT          NOT NULL REFERENCES alumnos(id_alumno)        ON DELETE CASCADE,
    nota            DECIMAL(4,1),
    asistio         BOOLEAN      NOT NULL DEFAULT FALSE,
    UNIQUE (id_examen, id_alumno)
);

-- Seed data solo si está vacío
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM examenes_curso LIMIT 1) THEN

    -- ── 5to Sec B  (id_aula_curso = 1) ──────────────────────
    INSERT INTO examenes_curso
        (id_aula_curso, numero_examen, semana, clase, titulo, descripcion, tipo, fecha_examen, duracion_minutos, nota_maxima, fecha_creacion)
    VALUES
      (1, 1, 2, 2, 'Examen Bimestral I: Números Enteros y Decimales',
       'Comprende los temas de números enteros, operaciones y decimales vistos en las semanas 1 y 2.',
       'escrito', CURRENT_DATE + 10, 90, 20, NOW() - INTERVAL '5 days'),
      (1, 2, 4, 2, 'Examen Bimestral II: Fracciones y Razones',
       'Abarca fracciones equivalentes, simplificación y operaciones con fracciones.',
       'escrito', CURRENT_DATE + 24, 90, 20, NOW() - INTERVAL '1 day');

    -- notas para examenes de 5to Sec B
    INSERT INTO notas_examen (id_examen, id_alumno, nota, asistio)
    SELECT e.id_examen, m.id_alumno, NULL, FALSE
    FROM examenes_curso e
    JOIN aula_cursos ac ON ac.id_aula_curso = e.id_aula_curso
    JOIN matriculas  m  ON m.id_aula = ac.id_aula AND m.estado = 'activa'
    WHERE e.id_aula_curso = 1
    ON CONFLICT DO NOTHING;

    -- marcar examen 1 de Juan como asistido y calificado
    UPDATE notas_examen ne
    SET asistio = TRUE, nota = 17.5
    FROM examenes_curso e
    WHERE ne.id_examen = e.id_examen
      AND e.id_aula_curso = 1 AND e.numero_examen = 1
      AND ne.id_alumno = 1;

    -- ── 3ro Sec A  (id_aula_curso = 9) ──────────────────────
    INSERT INTO examenes_curso
        (id_aula_curso, numero_examen, semana, clase, titulo, descripcion, tipo, fecha_examen, duracion_minutos, nota_maxima, fecha_creacion)
    VALUES
      (9, 1, 2, 1, 'Evaluación Parcial: Álgebra Básica',
       'Temas: expresiones algebraicas y ecuaciones de primer grado.',
       'escrito', CURRENT_DATE + 8, 60, 20, NOW() - INTERVAL '3 days');

    INSERT INTO notas_examen (id_examen, id_alumno, nota, asistio)
    SELECT e.id_examen, m.id_alumno, NULL, FALSE
    FROM examenes_curso e
    JOIN aula_cursos ac ON ac.id_aula_curso = e.id_aula_curso
    JOIN matriculas  m  ON m.id_aula = ac.id_aula AND m.estado = 'activa'
    WHERE e.id_aula_curso = 9
    ON CONFLICT DO NOTHING;

  END IF;
END $$;
