-- ============================================================
-- MIGRACIÓN: reportes_alumno + seed
-- ============================================================

CREATE TABLE IF NOT EXISTS reportes_alumno (
    id_reporte      SERIAL       PRIMARY KEY,
    id_aula_curso   INT          NOT NULL REFERENCES aula_cursos(id_aula_curso) ON DELETE CASCADE,
    id_alumno       INT          NOT NULL REFERENCES alumnos(id_alumno)         ON DELETE CASCADE,
    tipo            VARCHAR(30)  NOT NULL DEFAULT 'anotacion',
        -- pendiente | anotacion | llamada_atencion | felicitacion | otro
    titulo          VARCHAR(200) NOT NULL,
    descripcion     TEXT,
    fecha           DATE         NOT NULL DEFAULT CURRENT_DATE,
    visible_padre   BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_creacion  TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reportes_alumno_aula
    ON reportes_alumno(id_aula_curso, id_alumno);

-- Seed data solo si está vacío
DO $$
DECLARE
    v_alumno1 INT;
    v_alumno2 INT;
    v_alumno3 INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM reportes_alumno LIMIT 1) THEN

    -- Obtener ids de alumnos de 5to Sec B (id_aula_curso=1) y 3ro Sec A (id_aula_curso=9)
    SELECT m.id_alumno INTO v_alumno1
    FROM matriculas m
    JOIN aula_cursos ac ON ac.id_aula = m.id_aula
    WHERE ac.id_aula_curso = 1 AND m.estado = 'activa'
    ORDER BY m.id_alumno LIMIT 1;

    SELECT m.id_alumno INTO v_alumno2
    FROM matriculas m
    JOIN aula_cursos ac ON ac.id_aula = m.id_aula
    WHERE ac.id_aula_curso = 1 AND m.estado = 'activa'
    ORDER BY m.id_alumno OFFSET 1 LIMIT 1;

    SELECT m.id_alumno INTO v_alumno3
    FROM matriculas m
    JOIN aula_cursos ac ON ac.id_aula = m.id_aula
    WHERE ac.id_aula_curso = 9 AND m.estado = 'activa'
    ORDER BY m.id_alumno LIMIT 1;

    -- Reportes para alumno 1 en 5to Sec B
    IF v_alumno1 IS NOT NULL THEN
      INSERT INTO reportes_alumno (id_aula_curso, id_alumno, tipo, titulo, descripcion, fecha, visible_padre)
      VALUES
        (1, v_alumno1, 'pendiente',         'Entregar trabajo de fracciones',
         'El alumno tiene pendiente entregar el trabajo grupal de fracciones de la semana 2.',
         CURRENT_DATE - 5, true),
        (1, v_alumno1, 'felicitacion',      'Excelente participación en clase',
         'Demostró muy buen dominio de los números enteros y participó activamente.',
         CURRENT_DATE - 3, true),
        (1, v_alumno1, 'anotacion',         'Cambio de horario de refuerzo',
         'El padre solicitó cambiar el horario de tutoría al viernes por la tarde.',
         CURRENT_DATE - 1, false);
    END IF;

    -- Reportes para alumno 2 en 5to Sec B
    IF v_alumno2 IS NOT NULL THEN
      INSERT INTO reportes_alumno (id_aula_curso, id_alumno, tipo, titulo, descripcion, fecha, visible_padre)
      VALUES
        (1, v_alumno2, 'llamada_atencion',  'Conducta disruptiva en clase',
         'Se le llamó la atención por interrumpir reiteradamente durante la explicación del bimestre.',
         CURRENT_DATE - 7, true),
        (1, v_alumno2, 'pendiente',         'Firma de citación pendiente',
         'El padre debe firmar y devolver la citación enviada el lunes pasado.',
         CURRENT_DATE - 2, true);
    END IF;

    -- Reportes para alumno 3 en 3ro Sec A
    IF v_alumno3 IS NOT NULL THEN
      INSERT INTO reportes_alumno (id_aula_curso, id_alumno, tipo, titulo, descripcion, fecha, visible_padre)
      VALUES
        (9, v_alumno3, 'anotacion',         'Dificultad con ecuaciones lineales',
         'El alumno muestra dificultades al resolver ecuaciones de primer grado. Se recomienda refuerzo.',
         CURRENT_DATE - 4, true),
        (9, v_alumno3, 'otro',              'Material de apoyo enviado',
         'Se envió material adicional de práctica al correo del alumno.',
         CURRENT_DATE - 1, false);
    END IF;

  END IF;
END $$;
