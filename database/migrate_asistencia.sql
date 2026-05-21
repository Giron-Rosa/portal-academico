-- ============================================================
-- MIGRACIÓN: asistencia_alumno + seed
-- ============================================================

CREATE TABLE IF NOT EXISTS asistencia_alumno (
    id_asistencia   SERIAL      PRIMARY KEY,
    id_aula_curso   INT         NOT NULL REFERENCES aula_cursos(id_aula_curso) ON DELETE CASCADE,
    id_alumno       INT         NOT NULL REFERENCES alumnos(id_alumno)         ON DELETE CASCADE,
    fecha           DATE        NOT NULL,
    estado          VARCHAR(20) NOT NULL DEFAULT 'presente',
        -- presente | falta | tardanza | justificado
    justificante    TEXT,
    fecha_registro  TIMESTAMP   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_asistencia UNIQUE (id_aula_curso, id_alumno, fecha)
);

CREATE INDEX IF NOT EXISTS idx_asistencia_aula_fecha
    ON asistencia_alumno(id_aula_curso, fecha);

-- Seed: últimos 3 días hábiles para 5to Sec B (id_aula_curso = 1)
DO $$
DECLARE
    v_alumnos INT[];
    v_al      INT;
    v_fecha   DATE;
    i         INT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM asistencia_alumno LIMIT 1) THEN

    -- Obtener hasta 5 alumnos de 5to Sec B
    SELECT ARRAY(
        SELECT m.id_alumno
        FROM   matriculas  m
        JOIN   aula_cursos ac ON ac.id_aula = m.id_aula
        WHERE  ac.id_aula_curso = 1 AND m.estado = 'activa'
        ORDER  BY m.id_alumno
        LIMIT  5
    ) INTO v_alumnos;

    -- Registrar asistencia para los últimos 3 días (hoy - 2, ayer, hoy)
    FOR i IN 0..2 LOOP
        v_fecha := CURRENT_DATE - i;

        FOREACH v_al IN ARRAY v_alumnos LOOP
            INSERT INTO asistencia_alumno (id_aula_curso, id_alumno, fecha, estado, justificante)
            VALUES (
                1,
                v_al,
                v_fecha,
                CASE
                    WHEN i = 1 AND v_al = v_alumnos[2] THEN 'falta'
                    WHEN i = 1 AND v_al = v_alumnos[3] THEN 'justificado'
                    WHEN i = 2 AND v_al = v_alumnos[1] THEN 'tardanza'
                    ELSE 'presente'
                END,
                CASE
                    WHEN i = 1 AND v_al = v_alumnos[3]
                        THEN 'Certificado médico presentado por el padre.'
                    ELSE NULL
                END
            )
            ON CONFLICT (id_aula_curso, id_alumno, fecha) DO NOTHING;
        END LOOP;
    END LOOP;

  END IF;
END $$;
