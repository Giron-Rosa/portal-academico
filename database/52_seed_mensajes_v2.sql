-- ============================================================
-- SEED v2: Padres adicionales + mensajes tipo chat con varios padres
-- Ejecutar: docker cp database/seed_mensajes_v2.sql portal-academico-db:/tmp/seed_v2.sql
--           docker exec portal-academico-db psql -U sa_admin -d portal_academico -f /tmp/seed_v2.sql
-- ============================================================
SET client_encoding = 'UTF8';

-- ── Nuevos usuarios padre ──────────────────────────────────
INSERT INTO usuarios (codigo, email, contrasena_hash, rol, activo) VALUES
    ('PAD-2024-00201', 'patricio.martinez@gmail.com',   '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG', 'padre', TRUE),
    ('PAD-2024-00202', 'carmen.rodriguez@gmail.com',    '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG', 'padre', TRUE),
    ('PAD-2024-00203', 'roberto.garcia@gmail.com',      '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG', 'padre', TRUE),
    ('PAD-2024-00204', 'isabel.vargas@gmail.com',       '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG', 'padre', TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- ── Nuevos usuarios alumno ─────────────────────────────────
INSERT INTO usuarios (codigo, email, contrasena_hash, rol, activo) VALUES
    ('5B261010', 'diego.martinezp@alumnos.sanagustin.edu.pe', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG', 'alumno', TRUE),
    ('4A261011', 'elena.rodriguez@alumnos.sanagustin.edu.pe', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG', 'alumno', TRUE),
    ('5B261012', 'ana.garcia@alumnos.sanagustin.edu.pe',      '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG', 'alumno', TRUE),
    ('4A261013', 'hector.vargas@alumnos.sanagustin.edu.pe',   '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG', 'alumno', TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- ── Perfil padres ──────────────────────────────────────────
INSERT INTO padres (id_usuario, nombre, apellido, dni, telefono)
SELECT id_usuario, 'Patricio',  'Martínez P.',  '41234001', '991001001'
FROM usuarios WHERE codigo = 'PAD-2024-00201'
ON CONFLICT (id_usuario) DO NOTHING;

INSERT INTO padres (id_usuario, nombre, apellido, dni, telefono)
SELECT id_usuario, 'Carmen',    'Rodríguez L.', '41234002', '991001002'
FROM usuarios WHERE codigo = 'PAD-2024-00202'
ON CONFLICT (id_usuario) DO NOTHING;

INSERT INTO padres (id_usuario, nombre, apellido, dni, telefono)
SELECT id_usuario, 'Roberto',   'García M.',    '41234003', '991001003'
FROM usuarios WHERE codigo = 'PAD-2024-00203'
ON CONFLICT (id_usuario) DO NOTHING;

INSERT INTO padres (id_usuario, nombre, apellido, dni, telefono)
SELECT id_usuario, 'Isabel',    'Vargas T.',    '41234004', '991001004'
FROM usuarios WHERE codigo = 'PAD-2024-00204'
ON CONFLICT (id_usuario) DO NOTHING;

-- ── Perfil alumnos ─────────────────────────────────────────
INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
SELECT id_usuario, 'Diego',  'Martínez',  '5to Secundaria', 'B', '2008-04-12'
FROM usuarios WHERE codigo = '5B261010'
ON CONFLICT (id_usuario) DO NOTHING;

INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
SELECT id_usuario, 'Elena',  'Rodríguez', '4to Secundaria', 'A', '2009-07-18'
FROM usuarios WHERE codigo = '4A261011'
ON CONFLICT (id_usuario) DO NOTHING;

INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
SELECT id_usuario, 'Ana',    'García',    '5to Secundaria', 'B', '2008-11-30'
FROM usuarios WHERE codigo = '5B261012'
ON CONFLICT (id_usuario) DO NOTHING;

INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
SELECT id_usuario, 'Héctor', 'Vargas',    '4to Secundaria', 'A', '2009-02-25'
FROM usuarios WHERE codigo = '4A261013'
ON CONFLICT (id_usuario) DO NOTHING;

-- ── Relación padre–hijo ────────────────────────────────────
INSERT INTO padre_hijo (id_padre, id_alumno, parentesco, es_principal)
SELECT p.id_padre, a.id_alumno, 'padre', TRUE
FROM padres p
  JOIN usuarios up ON up.id_usuario = p.id_usuario
  JOIN alumnos a ON TRUE
  JOIN usuarios ua ON ua.id_usuario = a.id_usuario
WHERE up.codigo = 'PAD-2024-00201' AND ua.codigo = '5B261010'
ON CONFLICT DO NOTHING;

INSERT INTO padre_hijo (id_padre, id_alumno, parentesco, es_principal)
SELECT p.id_padre, a.id_alumno, 'madre', TRUE
FROM padres p
  JOIN usuarios up ON up.id_usuario = p.id_usuario
  JOIN alumnos a ON TRUE
  JOIN usuarios ua ON ua.id_usuario = a.id_usuario
WHERE up.codigo = 'PAD-2024-00202' AND ua.codigo = '4A261011'
ON CONFLICT DO NOTHING;

INSERT INTO padre_hijo (id_padre, id_alumno, parentesco, es_principal)
SELECT p.id_padre, a.id_alumno, 'padre', TRUE
FROM padres p
  JOIN usuarios up ON up.id_usuario = p.id_usuario
  JOIN alumnos a ON TRUE
  JOIN usuarios ua ON ua.id_usuario = a.id_usuario
WHERE up.codigo = 'PAD-2024-00203' AND ua.codigo = '5B261012'
ON CONFLICT DO NOTHING;

INSERT INTO padre_hijo (id_padre, id_alumno, parentesco, es_principal)
SELECT p.id_padre, a.id_alumno, 'madre', TRUE
FROM padres p
  JOIN usuarios up ON up.id_usuario = p.id_usuario
  JOIN alumnos a ON TRUE
  JOIN usuarios ua ON ua.id_usuario = a.id_usuario
WHERE up.codigo = 'PAD-2024-00204' AND ua.codigo = '4A261013'
ON CONFLICT DO NOTHING;

-- ── Matricular alumnos en aula 1 (5to Sec B) ──────────────
INSERT INTO matriculas (id_alumno, id_aula, fecha_matricula, estado)
SELECT a.id_alumno, 1, '2026-03-01', 'activa'
FROM alumnos a JOIN usuarios u ON u.id_usuario = a.id_usuario
WHERE u.codigo IN ('5B261010', '5B261012')
ON CONFLICT DO NOTHING;

-- ── Mensajes tipo chat: Patricio sobre Diego ───────────────
DO $$
DECLARE
    v_pad1  INT; v_mae1  INT; v_alu1  INT; v_ac1  INT;
    v_pad2  INT; v_mae2  INT; v_alu2  INT; v_ac2  INT;
    v_pad3  INT; v_alu3  INT;
    v_pad4  INT; v_alu4  INT;
    v_usr_doc INT;
    v_msg1  INT; v_msg2  INT; v_msg3  INT; v_msg4  INT;
BEGIN
    SELECT p.id_padre  INTO v_pad1  FROM padres p JOIN usuarios u ON u.id_usuario = p.id_usuario WHERE u.codigo = 'PAD-2024-00201';
    SELECT m.id_maestro INTO v_mae1 FROM maestros m JOIN usuarios u ON u.id_usuario = m.id_usuario WHERE u.codigo = 'OC16Mar26';
    SELECT a.id_alumno  INTO v_alu1 FROM alumnos a JOIN usuarios u ON u.id_usuario = a.id_usuario WHERE u.codigo = '5B261010';
    SELECT ac.id_aula_curso INTO v_ac1 FROM aula_cursos ac WHERE ac.id_aula = 1 AND ac.id_curso = 1;
    SELECT id_usuario INTO v_usr_doc FROM usuarios WHERE codigo = 'OC16Mar26';

    SELECT p.id_padre  INTO v_pad2  FROM padres p JOIN usuarios u ON u.id_usuario = p.id_usuario WHERE u.codigo = 'PAD-2024-00202';
    SELECT a.id_alumno  INTO v_alu2 FROM alumnos a JOIN usuarios u ON u.id_usuario = a.id_usuario WHERE u.codigo = '4A261011';
    SELECT ac.id_aula_curso INTO v_ac2 FROM aula_cursos ac WHERE ac.id_aula = 2 AND ac.id_curso = 1;

    SELECT p.id_padre  INTO v_pad3  FROM padres p JOIN usuarios u ON u.id_usuario = p.id_usuario WHERE u.codigo = 'PAD-2024-00203';
    SELECT a.id_alumno  INTO v_alu3 FROM alumnos a JOIN usuarios u ON u.id_usuario = a.id_usuario WHERE u.codigo = '5B261012';

    SELECT p.id_padre  INTO v_pad4  FROM padres p JOIN usuarios u ON u.id_usuario = p.id_usuario WHERE u.codigo = 'PAD-2024-00204';
    SELECT a.id_alumno  INTO v_alu4 FROM alumnos a JOIN usuarios u ON u.id_usuario = a.id_usuario WHERE u.codigo = '4A261013';

    -- Chat 1: Patricio / Diego  (consulta material – respondido)
    IF NOT EXISTS (SELECT 1 FROM mensajes WHERE id_padre = v_pad1 AND id_maestro = v_mae1 AND id_alumno = v_alu1) THEN
        INSERT INTO mensajes (id_padre, id_maestro, id_alumno, id_aula_curso, asunto, cuerpo, tipo, leido, fecha_envio)
        VALUES (v_pad1, v_mae1, v_alu1, v_ac1,
                'Material de recuperación – Diego Martínez',
                'Profesor, buenas tardes. Mi hijo no pudo asistir a clase hoy. ¿Es posible recuperar los ejercicios?',
                'consulta', TRUE, NOW() - INTERVAL '2 hours')
        RETURNING id_mensaje INTO v_msg1;

        INSERT INTO mensajes_respuestas (id_mensaje, id_usuario, cuerpo, fecha) VALUES
            (v_msg1, v_usr_doc, 'Buenas tardes, Sr. Martínez. Claro que sí, puedo compartirle el material.', NOW() - INTERVAL '1 hour 50 min'),
            (v_msg1, v_usr_doc, 'El tema fue Vectores y Magnitudes Físicas. Le adjunto el material de la Clase 1 – Semana 01.', NOW() - INTERVAL '1 hour 45 min');
    END IF;

    -- Chat 2: Carmen / Elena  (consulta examen – sin respuesta, no leído)
    IF NOT EXISTS (SELECT 1 FROM mensajes WHERE id_padre = v_pad2 AND id_maestro = v_mae1 AND id_alumno = v_alu2) THEN
        INSERT INTO mensajes (id_padre, id_maestro, id_alumno, id_aula_curso, asunto, cuerpo, tipo, leido, fecha_envio)
        VALUES (v_pad2, v_mae1, v_alu2, v_ac2,
                'Consulta sobre el próximo examen – Elena',
                '¿Cuándo es el examen?',
                'consulta', FALSE, NOW() - INTERVAL '1 day')
        RETURNING id_mensaje INTO v_msg2;
    END IF;

    -- Chat 3: Roberto / Ana  (consulta – parcialmente respondido, leído)
    IF NOT EXISTS (SELECT 1 FROM mensajes WHERE id_padre = v_pad3 AND id_maestro = v_mae1 AND id_alumno = v_alu3) THEN
        INSERT INTO mensajes (id_padre, id_maestro, id_alumno, id_aula_curso, asunto, cuerpo, tipo, leido, fecha_envio)
        VALUES (v_pad3, v_mae1, v_alu3, v_ac1,
                'Agradecimiento – Ana García',
                'Gracias profesor, mi hija mejoró bastante esta semana.',
                'consulta', TRUE, NOW() - INTERVAL '1 day')
        RETURNING id_mensaje INTO v_msg3;

        INSERT INTO mensajes_respuestas (id_mensaje, id_usuario, cuerpo, fecha) VALUES
            (v_msg3, v_usr_doc, 'Gracias profesor', NOW() - INTERVAL '20 hours');
    END IF;

    -- Chat 4: Isabel / Héctor  (justificante – no leído, 1 notificación)
    IF NOT EXISTS (SELECT 1 FROM mensajes WHERE id_padre = v_pad4 AND id_maestro = v_mae1 AND id_alumno = v_alu4) THEN
        INSERT INTO mensajes (id_padre, id_maestro, id_alumno, id_aula_curso, asunto, cuerpo, tipo, leido, fecha_envio)
        VALUES (v_pad4, v_mae1, v_alu4, v_ac2,
                'Héctor no entregó el trabajo – aviso',
                'Profesor, le aviso que Héctor no entregó el trabajo porque estuvo enfermo. Adjunto certificado médico.',
                'justificante', FALSE, NOW() - INTERVAL '2 days')
        RETURNING id_mensaje INTO v_msg4;
    END IF;
END $$;

-- ── Notas de tarea y asistencia para los nuevos alumnos ────
-- Agregar notas_tarea para Diego y Ana en aula 1
INSERT INTO notas_tarea (id_tarea, id_alumno, nota, entregado)
SELECT t.id_tarea,
       a.id_alumno,
       CASE t.numero_tarea WHEN 1 THEN 18.0 WHEN 2 THEN 15.0 ELSE NULL END,
       CASE t.numero_tarea WHEN 1 THEN TRUE  WHEN 2 THEN TRUE  ELSE FALSE END
FROM tareas_curso t
JOIN alumnos a ON a.id_usuario IN (
    SELECT id_usuario FROM usuarios WHERE codigo IN ('5B261010', '5B261012')
)
WHERE t.id_aula_curso = 1
ON CONFLICT DO NOTHING;

-- Asistencia: Diego presente casi siempre (91%)
INSERT INTO asistencia_alumno (id_aula_curso, id_alumno, fecha, estado)
SELECT 1,
       a.id_alumno,
       CURRENT_DATE - s,
       CASE WHEN s IN (3, 12) THEN 'falta' WHEN s = 7 THEN 'justificado' ELSE 'presente' END
FROM generate_series(1, 20) AS s,
     alumnos a JOIN usuarios u ON u.id_usuario = a.id_usuario
WHERE u.codigo = '5B261010'
ON CONFLICT DO NOTHING;
