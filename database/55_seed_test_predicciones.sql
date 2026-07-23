-- =====================================================================
-- SEED: Alumnos de Prueba para Estresar Predicciones (Docente: Oscar Castillo)
-- Curso: Matemática, 5to Sec B (id_aula_curso = 1)
-- =====================================================================

DO $$
DECLARE
    r_usuario_id INT;
    r_alumno_id  INT;
    v_fecha      DATE;
    v_tarea1_id  INT;
    v_tarea2_id  INT;
    v_tarea3_id  INT;
    i            INT;
BEGIN
    -- 1. Obtener los IDs de las tareas existentes para id_aula_curso = 1
    SELECT id_tarea INTO v_tarea1_id FROM tareas_curso WHERE id_aula_curso = 1 AND numero_tarea = 1;
    SELECT id_tarea INTO v_tarea2_id FROM tareas_curso WHERE id_aula_curso = 1 AND numero_tarea = 2;
    SELECT id_tarea INTO v_tarea3_id FROM tareas_curso WHERE id_aula_curso = 1 AND numero_tarea = 3;

    -- ==========================================
    -- ALUMNO 1: RIESGO ALTO (Asistencia y Notas críticas)
    -- ==========================================
    INSERT INTO usuarios (codigo, email, contrasena_hash, rol, activo)
    VALUES ('AL-HIGH-01', 'high01@alumnos.sanagustin.edu.pe', '$2a$10$tMh4GfXmEeqYtY5/D8YyOeuY9.yDFeE2K0q4e2/gK2o/T1E2B7P6K', 'alumno', TRUE) -- BCrypt hash of "password"
    RETURNING id_usuario INTO r_usuario_id;

    INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
    VALUES (r_usuario_id, 'Ramiro', 'Alto Asistencia Notas', '5to Secundaria', 'B', '2008-01-10')
    RETURNING id_alumno INTO r_alumno_id;

    INSERT INTO matriculas (id_alumno, id_aula, fecha_matricula, estado) VALUES (r_alumno_id, 1, '2026-03-01', 'activa');

    -- Asistencia: 4 Presente, 6 Faltas (40% asistencia) -> FactorAsistencia = 100
    FOR i IN 0..9 LOOP
        v_fecha := CURRENT_DATE - i;
        INSERT INTO asistencia_alumno (id_aula_curso, id_alumno, fecha, estado)
        VALUES (1, r_alumno_id, v_fecha, CASE WHEN i % 3 = 0 THEN 'presente' ELSE 'falta' END);
    END LOOP;

    -- Notas: Promedio = 6.0 (< 8.0) -> FactorNota = 100
    -- Índice esperado: 100 * 0.6 + 100 * 0.4 = 100 (Riesgo ALTO)
    INSERT INTO notas_tarea (id_tarea, id_alumno, nota, entregado) VALUES 
        (v_tarea1_id, r_alumno_id, 5.0, TRUE),
        (v_tarea2_id, r_alumno_id, 7.0, TRUE),
        (v_tarea3_id, r_alumno_id, 6.0, TRUE);

    -- ==========================================
    -- ALUMNO 2: RIESGO ALTO (Asistencia crítica, Excelentes notas)
    -- ==========================================
    INSERT INTO usuarios (codigo, email, contrasena_hash, rol, activo)
    VALUES ('AL-HIGH-02', 'high02@alumnos.sanagustin.edu.pe', '$2a$10$tMh4GfXmEeqYtY5/D8YyOeuY9.yDFeE2K0q4e2/gK2o/T1E2B7P6K', 'alumno', TRUE)
    RETURNING id_usuario INTO r_usuario_id;

    INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
    VALUES (r_usuario_id, 'Lucía', 'Alto Asistencia NotasOk', '5to Secundaria', 'B', '2008-02-15')
    RETURNING id_alumno INTO r_alumno_id;

    INSERT INTO matriculas (id_alumno, id_aula, fecha_matricula, estado) VALUES (r_alumno_id, 1, '2026-03-01', 'activa');

    -- Asistencia: 4 Presente, 6 Faltas (40% asistencia) -> FactorAsistencia = 100
    FOR i IN 0..9 LOOP
        v_fecha := CURRENT_DATE - i;
        INSERT INTO asistencia_alumno (id_aula_curso, id_alumno, fecha, estado)
        VALUES (1, r_alumno_id, v_fecha, CASE WHEN i % 3 = 0 THEN 'presente' ELSE 'falta' END);
    END LOOP;

    -- Notas: Promedio = 17.0 (>= 13.0) -> FactorNota = 0
    -- Índice esperado: 100 * 0.6 + 0 * 0.4 = 60 (Riesgo ALTO)
    INSERT INTO notas_tarea (id_tarea, id_alumno, nota, entregado) VALUES 
        (v_tarea1_id, r_alumno_id, 16.0, TRUE),
        (v_tarea2_id, r_alumno_id, 18.0, TRUE),
        (v_tarea3_id, r_alumno_id, 17.0, TRUE);

    -- ==========================================
    -- ALUMNO 3: RIESGO MEDIO (Asistencia perfecta, Notas críticas)
    -- ==========================================
    INSERT INTO usuarios (codigo, email, contrasena_hash, rol, activo)
    VALUES ('AL-MED-01', 'med01@alumnos.sanagustin.edu.pe', '$2a$10$tMh4GfXmEeqYtY5/D8YyOeuY9.yDFeE2K0q4e2/gK2o/T1E2B7P6K', 'alumno', TRUE)
    RETURNING id_usuario INTO r_usuario_id;

    INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
    VALUES (r_usuario_id, 'Mateo', 'Medio AsistenciaOk Notas', '5to Secundaria', 'B', '2008-03-20')
    RETURNING id_alumno INTO r_alumno_id;

    INSERT INTO matriculas (id_alumno, id_aula, fecha_matricula, estado) VALUES (r_alumno_id, 1, '2026-03-01', 'activa');

    -- Asistencia: 10 Presente (100% asistencia) -> FactorAsistencia = 0
    FOR i IN 0..9 LOOP
        v_fecha := CURRENT_DATE - i;
        INSERT INTO asistencia_alumno (id_aula_curso, id_alumno, fecha, estado)
        VALUES (1, r_alumno_id, v_fecha, 'presente');
    END LOOP;

    -- Notas: Promedio = 7.0 (< 8.0) -> FactorNota = 100
    -- Índice esperado: 0 * 0.6 + 100 * 0.4 = 40 (Riesgo MEDIO)
    INSERT INTO notas_tarea (id_tarea, id_alumno, nota, entregado) VALUES 
        (v_tarea1_id, r_alumno_id, 8.0, TRUE),
        (v_tarea2_id, r_alumno_id, 6.0, TRUE),
        (v_tarea3_id, r_alumno_id, 7.0, TRUE);

    -- ==========================================
    -- ALUMNO 4: RIESGO MEDIO (Asistencia regular, Notas intermedias)
    -- ==========================================
    INSERT INTO usuarios (codigo, email, contrasena_hash, rol, activo)
    VALUES ('AL-MED-02', 'med02@alumnos.sanagustin.edu.pe', '$2a$10$tMh4GfXmEeqYtY5/D8YyOeuY9.yDFeE2K0q4e2/gK2o/T1E2B7P6K', 'alumno', TRUE)
    RETURNING id_usuario INTO r_usuario_id;

    INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
    VALUES (r_usuario_id, 'Sofía', 'Medio Regular Regular', '5to Secundaria', 'B', '2008-04-25')
    RETURNING id_alumno INTO r_alumno_id;

    INSERT INTO matriculas (id_alumno, id_aula, fecha_matricula, estado) VALUES (r_alumno_id, 1, '2026-03-01', 'activa');

    -- Asistencia: 6 Presente, 2 Tardanza, 2 Falta (80% presencia) -> FactorAsistencia = 55
    FOR i IN 0..9 LOOP
        v_fecha := CURRENT_DATE - i;
        INSERT INTO asistencia_alumno (id_aula_curso, id_alumno, fecha, estado)
        VALUES (1, r_alumno_id, v_fecha, 
            CASE 
                WHEN i = 1 OR i = 5 THEN 'falta'
                WHEN i = 2 OR i = 7 THEN 'tardanza'
                ELSE 'presente'
            END);
    END LOOP;

    -- Notas: Promedio = 11.5 (< 13.0) -> FactorNota = 35
    -- Índice esperado: 55 * 0.6 + 35 * 0.4 = 33 + 14 = 47 (Riesgo MEDIO)
    INSERT INTO notas_tarea (id_tarea, id_alumno, nota, entregado) VALUES 
        (v_tarea1_id, r_alumno_id, 11.0, TRUE),
        (v_tarea2_id, r_alumno_id, 12.0, TRUE),
        (v_tarea3_id, r_alumno_id, 11.5, TRUE);

    -- ==========================================
    -- ALUMNO 5: RIESGO BAJO (Asistencia excelente, Notas excelentes)
    -- ==========================================
    INSERT INTO usuarios (codigo, email, contrasena_hash, rol, activo)
    VALUES ('AL-LOW-01', 'low01@alumnos.sanagustin.edu.pe', '$2a$10$tMh4GfXmEeqYtY5/D8YyOeuY9.yDFeE2K0q4e2/gK2o/T1E2B7P6K', 'alumno', TRUE)
    RETURNING id_usuario INTO r_usuario_id;

    INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
    VALUES (r_usuario_id, 'Renato', 'Bajo Excelente', '5to Secundaria', 'B', '2008-05-30')
    RETURNING id_alumno INTO r_alumno_id;

    INSERT INTO matriculas (id_alumno, id_aula, fecha_matricula, estado) VALUES (r_alumno_id, 1, '2026-03-01', 'activa');

    -- Asistencia: 10 Presente (100% asistencia) -> FactorAsistencia = 0
    FOR i IN 0..9 LOOP
        v_fecha := CURRENT_DATE - i;
        INSERT INTO asistencia_alumno (id_aula_curso, id_alumno, fecha, estado)
        VALUES (1, r_alumno_id, v_fecha, 'presente');
    END LOOP;

    -- Notas: Promedio = 18.3 (>= 13.0) -> FactorNota = 0
    -- Índice esperado: 0 * 0.6 + 0 * 0.4 = 0 (Riesgo BAJO)
    INSERT INTO notas_tarea (id_tarea, id_alumno, nota, entregado) VALUES 
        (v_tarea1_id, r_alumno_id, 18.0, TRUE),
        (v_tarea2_id, r_alumno_id, 19.0, TRUE),
        (v_tarea3_id, r_alumno_id, 18.0, TRUE);

END $$;
