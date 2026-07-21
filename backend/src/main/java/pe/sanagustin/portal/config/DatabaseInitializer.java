package pe.sanagustin.portal.config;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseInitializer implements CommandLineRunner {

    @PersistenceContext
    private final EntityManager em;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        log.info("[DB Initializer] Verificando e inicializando tabla student_notes...");
        try {
            String createTableSql = """
                    CREATE TABLE IF NOT EXISTS student_notes (
                        id_nota             BIGSERIAL PRIMARY KEY,
                        id_alumno           BIGINT       NOT NULL REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
                        titulo              VARCHAR(150) NOT NULL,
                        contenido           TEXT,
                        resumen_ia          TEXT,
                        fecha_creacion      TIMESTAMP    NOT NULL DEFAULT NOW(),
                        fecha_actualizacion TIMESTAMP    NOT NULL DEFAULT NOW()
                    )
                    """;
            em.createNativeQuery(createTableSql).executeUpdate();

            String addColumnSql = """
                    ALTER TABLE student_notes ADD COLUMN IF NOT EXISTS guion_podcast TEXT
                    """;
            em.createNativeQuery(addColumnSql).executeUpdate();

            String addUrlDocSql = """
                    ALTER TABLE student_notes ADD COLUMN IF NOT EXISTS url_documento VARCHAR(500)
                    """;
            em.createNativeQuery(addUrlDocSql).executeUpdate();

            String createIndexSql = """
                    CREATE INDEX IF NOT EXISTS idx_student_notes_alumno ON student_notes(id_alumno)
                    """;
            em.createNativeQuery(createIndexSql).executeUpdate();

            String alterAsistenciaSql = """
                    ALTER TABLE asistencia_alumno ADD COLUMN IF NOT EXISTS fecha_registro TIMESTAMP NOT NULL DEFAULT NOW()
                    """;
            em.createNativeQuery(alterAsistenciaSql).executeUpdate();

            log.info("[DB Initializer] Sembrando tareas y notas de Matemática de prueba...");
            String seedMatematicaSql = """
                    DO $$
                    DECLARE
                        v_id_matematica INT;
                        v_aula_curso RECORD;
                        v_alumno RECORD;
                        v_tarea1_id BIGINT;
                        v_tarea2_id BIGINT;
                        v_tarea3_id BIGINT;
                    BEGIN
                        SELECT id_curso INTO v_id_matematica FROM cursos WHERE nombre ILIKE '%matem%' LIMIT 1;
                        
                        IF v_id_matematica IS NULL THEN
                            RETURN;
                        END IF;
                    
                        FOR v_aula_curso IN 
                            SELECT id_aula_curso, id_aula 
                            FROM aula_cursos 
                            WHERE id_curso = v_id_matematica
                        LOOP
                            IF NOT EXISTS (SELECT 1 FROM tareas_curso WHERE id_aula_curso = v_aula_curso.id_aula_curso) THEN
                                
                                INSERT INTO tareas_curso (id_aula_curso, numero_tarea, semana, clase, titulo, descripcion, tipo_entregable, fecha_entrega, nota_maxima, intentos, fecha_creacion)
                                VALUES (v_aula_curso.id_aula_curso, 1, 1, 1, 'Tarea de Matemática 1', 'Ejercicios prácticos de álgebra básica.', 'archivo', CURRENT_DATE - 15, 20, 1, NOW() - INTERVAL '16 days')
                                RETURNING id_tarea INTO v_tarea1_id;
                    
                                INSERT INTO tareas_curso (id_aula_curso, numero_tarea, semana, clase, titulo, descripcion, tipo_entregable, fecha_entrega, nota_maxima, intentos, fecha_creacion)
                                VALUES (v_aula_curso.id_aula_curso, 2, 3, 1, 'Tarea de Matemática 2', 'Problemas aplicados de ecuaciones.', 'archivo', CURRENT_DATE - 8, 20, 1, NOW() - INTERVAL '9 days')
                                RETURNING id_tarea INTO v_tarea2_id;
                    
                                INSERT INTO tareas_curso (id_aula_curso, numero_tarea, semana, clase, titulo, descripcion, tipo_entregable, fecha_entrega, nota_maxima, intentos, fecha_creacion)
                                VALUES (v_aula_curso.id_aula_curso, 3, 5, 1, 'Tarea de Matemática 3', 'Consolidado de geometría elemental.', 'archivo', CURRENT_DATE - 2, 20, 1, NOW() - INTERVAL '3 days')
                                RETURNING id_tarea INTO v_tarea3_id;
                    
                                FOR v_alumno IN 
                                    SELECT m.id_alumno
                                    FROM matriculas m
                                    JOIN alumnos a ON a.id_alumno = m.id_alumno
                                    WHERE m.id_aula = v_aula_curso.id_aula AND m.estado = 'activa'
                                LOOP
                                    INSERT INTO notas_tarea (id_alumno, id_tarea, nota, entregado, fecha_entrega, intentos, comentarios, fecha_calificacion)
                                    VALUES (
                                        v_alumno.id_alumno, 
                                        v_tarea1_id, 
                                        CASE WHEN v_alumno.id_alumno % 3 = 0 THEN 09.0 WHEN v_alumno.id_alumno % 3 = 1 THEN 15.0 ELSE 18.0 END,
                                        TRUE, 
                                        CURRENT_DATE - 16, 
                                        1, 
                                        'Revisado por el docente.', 
                                        CURRENT_DATE - 15
                                    ) ON CONFLICT (id_tarea, id_alumno) DO NOTHING;
                    
                                    INSERT INTO notas_tarea (id_alumno, id_tarea, nota, entregado, fecha_entrega, intentos, comentarios, fecha_calificacion)
                                    VALUES (
                                        v_alumno.id_alumno, 
                                        v_tarea2_id, 
                                        CASE WHEN v_alumno.id_alumno % 3 = 0 THEN 10.0 WHEN v_alumno.id_alumno % 3 = 1 THEN 08.5 ELSE 16.0 END,
                                        TRUE, 
                                        CURRENT_DATE - 9, 
                                        1, 
                                        'Calificado.', 
                                        CURRENT_DATE - 8
                                    ) ON CONFLICT (id_tarea, id_alumno) DO NOTHING;
                    
                                    INSERT INTO notas_tarea (id_alumno, id_tarea, nota, entregado, fecha_entrega, intentos, comentarios, fecha_calificacion)
                                    VALUES (
                                        v_alumno.id_alumno, 
                                        v_tarea3_id, 
                                        CASE WHEN v_alumno.id_alumno % 3 = 0 THEN 08.0 WHEN v_alumno.id_alumno % 3 = 1 THEN 14.5 ELSE 09.5 END,
                                        TRUE, 
                                        CURRENT_DATE - 3, 
                                        1, 
                                        'Retroalimentación enviada.', 
                                        CURRENT_DATE - 2
                                    ) ON CONFLICT (id_tarea, id_alumno) DO NOTHING;
                    
                                END LOOP;
                            END IF;
                        END LOOP;
                    END $$;
                    """;
            em.createNativeQuery(seedMatematicaSql).executeUpdate();

            log.info("[DB Initializer] Tabla student_notes inicializada correctamente.");
        } catch (Exception e) {
            log.error("[DB Initializer] Error al inicializar la tabla student_notes en la base de datos: ", e);
        }
    }
}
