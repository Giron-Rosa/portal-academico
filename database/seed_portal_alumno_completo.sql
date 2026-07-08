-- ============================================================
-- SEED DATA: Calificaciones y Asistencia Completa para Juan Martínez (id_alumno = 1)
-- Abarca los Bimestres I, II, III y IV para los cursos de 5to Sec B (id_aula_curso 1 al 8)
-- ============================================================

-- 1. Limpiar tareas, exámenes y notas previas de estos cursos para evitar conflictos de claves únicas
DELETE FROM notas_tarea WHERE id_alumno = 1 AND id_tarea IN (SELECT id_tarea FROM tareas_curso WHERE id_aula_curso BETWEEN 1 AND 8);
DELETE FROM notas_examen WHERE id_alumno = 1 AND id_examen IN (SELECT id_examen FROM examenes_curso WHERE id_aula_curso BETWEEN 1 AND 8);
DELETE FROM asistencia_alumno WHERE id_alumno = 1 AND id_aula_curso BETWEEN 1 AND 8;

-- 2. Poblar tareas en todos los bimestres para los 8 cursos
-- Cada curso tendrá 1 tarea por bimestre (semanas 2, 6, 10, 14)
-- Matemática (1), Comunicación (2), Ciencia (3), Historia (4), Inglés (5), Arte (6), Ed. Física (7), Religión (8)
DO $$
DECLARE
    c_id INT;
    bim INT;
    sem INT;
    num_t INT;
    t_id BIGINT;
    e_id BIGINT;
    random_nota DECIMAL(4,1);
    random_asist BOOLEAN;
    random_est VARCHAR(20);
    clase_fecha DATE;
BEGIN
    FOR c_id IN 1..8 LOOP
        -- Tareas y Exámenes por Bimestre
        FOR bim IN 1..4 LOOP
            sem := (bim - 1) * 4 + 2; -- Semanas: 2, 6, 10, 14
            
            -- Crear Tarea
            INSERT INTO tareas_curso (id_aula_curso, numero_tarea, semana, clase, titulo, descripcion, tipo_entregable, fecha_entrega, nota_maxima, intentos, fecha_creacion)
            VALUES (
                c_id, 
                bim, 
                sem, 
                1, 
                'Tarea Bimestre ' || bim || ' - Curso ' || c_id,
                'Resolver la guía práctica correspondiente al tema del bimestre ' || bim,
                'archivo',
                CURRENT_DATE - (180 - sem * 10), -- Fechas en el pasado
                20,
                1,
                NOW() - (180 - sem * 10) * INTERVAL '1 day'
            ) RETURNING id_tarea INTO t_id;

            -- Crear Nota de Tarea para Juan (alumno 1)
            -- Simular algunas notas altas, regulares y bajas para tener variedad
            IF c_id = 1 THEN -- Matemática (en riesgo)
                IF bim = 1 THEN random_nota := 14.0;
                ELSIF bim = 2 THEN random_nota := 9.5;
                ELSIF bim = 3 THEN random_nota := 10.0;
                ELSE random_nota := NULL; -- Pendiente Bimestre IV
                END IF;
            ELSIF c_id = 2 THEN -- Comunicación (bueno)
                IF bim = 1 THEN random_nota := 16.0;
                ELSIF bim = 2 THEN random_nota := 17.5;
                ELSIF bim = 3 THEN random_nota := 15.0;
                ELSE random_nota := NULL;
                END IF;
            ELSIF c_id = 3 THEN -- Ciencia (bueno)
                IF bim = 1 THEN random_nota := 15.0;
                ELSIF bim = 2 THEN random_nota := 14.0;
                ELSIF bim = 3 THEN random_nota := 16.5;
                ELSE random_nota := NULL;
                END IF;
            ELSIF c_id = 4 THEN -- Historia (en riesgo)
                IF bim = 1 THEN random_nota := 11.0;
                ELSIF bim = 2 THEN random_nota := 9.0;
                ELSIF bim = 3 THEN random_nota := 10.5;
                ELSE random_nota := NULL;
                END IF;
            ELSE -- Otros cursos (aprobados)
                IF bim = 3 THEN random_nota := 13.0;
                ELSIF bim = 4 THEN random_nota := NULL;
                ELSE random_nota := 14.0 + (c_id % 3);
                END IF;
            END IF;

            INSERT INTO notas_tarea (id_tarea, id_alumno, entregado, nota, fecha_entrega, url_entrega)
            VALUES (
                t_id,
                1,
                (random_nota IS NOT NULL),
                random_nota,
                CASE WHEN random_nota IS NOT NULL THEN NOW() - (180 - sem * 10 - 2) * INTERVAL '1 day' ELSE NULL END,
                CASE WHEN random_nota IS NOT NULL THEN 'https://sanagustin.edu/entregas/tarea_' || t_id || '.pdf' ELSE NULL END
            );

            -- Crear Examen en la semana 4, 8, 12, 16
            INSERT INTO examenes_curso (id_aula_curso, numero_examen, semana, clase, titulo, descripcion, tipo, fecha_examen, duracion_minutos, nota_maxima, fecha_creacion)
            VALUES (
                c_id,
                bim,
                (bim * 4), -- Semanas: 4, 8, 12, 16
                2,
                'Examen Bimestral ' || bim || ' - Curso ' || c_id,
                'Evaluación teórica e integral de los contenidos del bimestre ' || bim,
                'escrito',
                CURRENT_DATE - (180 - bim * 40),
                90,
                20,
                NOW() - (180 - bim * 40) * INTERVAL '1 day'
            ) RETURNING id_examen INTO e_id;

            -- Crear Nota de Examen para Juan (alumno 1)
            IF c_id = 1 THEN -- Matemática
                IF bim = 1 THEN random_nota := 13.0;
                ELSIF bim = 2 THEN random_nota := 10.0;
                ELSIF bim = 3 THEN random_nota := 9.0;
                ELSE random_nota := NULL;
                END IF;
            ELSIF c_id = 4 THEN -- Historia
                IF bim = 1 THEN random_nota := 10.5;
                ELSIF bim = 2 THEN random_nota := 9.5;
                ELSIF bim = 3 THEN random_nota := 11.0;
                ELSE random_nota := NULL;
                END IF;
            ELSE -- Otros
                IF bim = 4 THEN random_nota := NULL;
                ELSE random_nota := 12.0 + (c_id % 4) + (bim % 2);
                END IF;
            END IF;

            INSERT INTO notas_examen (id_examen, id_alumno, asistio, nota)
            VALUES (
                e_id,
                1,
                (random_nota IS NOT NULL),
                random_nota
            );
        END LOOP;

        -- 3. Historial de Asistencia para los 8 cursos
        -- Registrar asistencias pasadas para simular el acumulado del año (semanas 1 a 12)
        -- Cada curso tiene 2 clases por semana. Registraremos asistencia para 12 semanas (24 clases en total)
        FOR sem IN 1..12 LOOP
            FOR num_t IN 1..2 LOOP
                clase_fecha := CURRENT_DATE - (180 - (sem * 10 + num_t));
                
                -- Determinar estado de asistencia de manera realista (Juan suele asistir pero tiene algunas faltas/tardanzas)
                IF c_id = 1 AND sem IN (3, 7) AND num_t = 1 THEN
                    random_est := 'falta';
                ELSIF c_id = 1 AND sem IN (5, 9) AND num_t = 2 THEN
                    random_est := 'tardanza';
                ELSIF c_id = 3 AND sem = 4 AND num_t = 1 THEN
                    random_est := 'justificado';
                ELSIF c_id = 4 AND sem IN (2, 8) AND num_t = 1 THEN
                    random_est := 'falta';
                ELSIF (sem + c_id + num_t) % 20 = 0 THEN
                    random_est := 'tardanza';
                ELSE
                    random_est := 'presente';
                END IF;

                INSERT INTO asistencia_alumno (id_alumno, id_aula_curso, fecha, estado, justificante)
                VALUES (
                    1,
                    c_id,
                    clase_fecha,
                    random_est,
                    CASE WHEN random_est = 'justificado' THEN 'Cita médica dental programada' ELSE NULL END
                ) ON CONFLICT (id_alumno, id_aula_curso, fecha) DO UPDATE 
                SET estado = EXCLUDED.estado, justificante = EXCLUDED.justificante;
            END LOOP;
        END LOOP;

    END LOOP;
END $$;

-- 4. Actualizar estado de las notas de la Fase 2 y 3
-- Juan Martínez (id_alumno = 1) promedio en riesgo para Matemática (id_aula_curso = 1) y regular para Historia (id_aula_curso = 4).
-- Asegura que haya materiales subidos de tipo 'refuerzo' para que la Fase 6 tenga datos.
-- Insertar algunos materiales de tipo 'refuerzo' y 'lectura' en la tabla de materiales
INSERT INTO materiales_curso (id_aula_curso, semana, clase, titulo, tipo, url, fecha_creacion)
VALUES 
    (1, 2, 1, 'Guía de Refuerzo: Números Enteros y Decimales', 'pdf', 'http://localhost:8080/material/refuerzo_mat_u1.pdf', NOW() - INTERVAL '40 days'),
    (1, 6, 2, 'Video Explicativo: Álgebra y Ecuaciones Básicas', 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', NOW() - INTERVAL '30 days'),
    (1, 10, 1, 'Libro de Referencia: Matemática para 5to de Secundaria', 'url', 'https://bibliotecadigital.pe/libros/mat5_sec.pdf', NOW() - INTERVAL '20 days'),
    (4, 2, 2, 'Lectura de Refuerzo: Historia del Perú Contemporáneo', 'word', 'http://localhost:8080/material/refuerzo_hist_u1.docx', NOW() - INTERVAL '35 days'),
    (4, 6, 1, 'Video Tutorial: Revolución Industrial y sus etapas', 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', NOW() - INTERVAL '25 days')
ON CONFLICT DO NOTHING;
