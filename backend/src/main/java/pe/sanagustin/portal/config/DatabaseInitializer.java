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

            log.info("[DB Initializer] Tabla student_notes inicializada correctamente.");
        } catch (Exception e) {
            log.error("[DB Initializer] Error al inicializar la tabla student_notes en la base de datos: ", e);
        }
    }
}
