-- ==========================================
-- FILE: 01_init.sql
-- ==========================================

-- ============================================================
-- Portal Académico - San Agustín Campus
-- Base de datos: PostgreSQL
-- ============================================================

-- Asegurar encoding UTF-8 para todos los datos de semilla
SET client_encoding = 'UTF8';

-- ============================================================
-- TIPOS ENUM
-- ============================================================

-- Los roles y parentescos se manejan como VARCHAR para compatibilidad con Hibernate/JPA

-- ============================================================
-- TABLA: usuarios  (autenticación central)
-- Formato de código:
--   Alumno  → 5B111808
--   Padre   → PAD-2024-00142
--   Maestro → OC16Mar26
--   Admin   → ADM-001
-- ============================================================

CREATE TABLE usuarios (
    id_usuario      SERIAL PRIMARY KEY,
    codigo          VARCHAR(30)  UNIQUE NOT NULL,
    email           VARCHAR(120) UNIQUE NOT NULL,
    contrasena_hash VARCHAR(255) NOT NULL,
    rol             VARCHAR(20)  NOT NULL,
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    ultimo_acceso   TIMESTAMP,
    fecha_creacion  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: alumnos
-- ============================================================

CREATE TABLE alumnos (
    id_alumno        SERIAL PRIMARY KEY,
    id_usuario       INT         UNIQUE NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    nombre           VARCHAR(80) NOT NULL,
    apellido         VARCHAR(80) NOT NULL,
    grado            VARCHAR(20) NOT NULL,
    seccion          VARCHAR(10) NOT NULL,
    fecha_nacimiento DATE        NOT NULL
);

-- ============================================================
-- TABLA: padres
-- ============================================================

CREATE TABLE padres (
    id_padre   SERIAL PRIMARY KEY,
    id_usuario INT         UNIQUE NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    nombre     VARCHAR(80) NOT NULL,
    apellido   VARCHAR(80) NOT NULL,
    dni        VARCHAR(20) UNIQUE NOT NULL,
    telefono   VARCHAR(20)
);

-- ============================================================
-- TABLA: maestros
-- ============================================================

CREATE TABLE maestros (
    id_maestro   SERIAL PRIMARY KEY,
    id_usuario   INT          UNIQUE NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    nombre       VARCHAR(80)  NOT NULL,
    apellido     VARCHAR(80)  NOT NULL,
    especialidad VARCHAR(100),
    dni          VARCHAR(20)  UNIQUE NOT NULL,
    telefono     VARCHAR(20)
);

-- ============================================================
-- TABLA: padre_hijo  (M:N entre padres y alumnos)
-- ============================================================

CREATE TABLE padre_hijo (
    id           SERIAL PRIMARY KEY,
    id_padre     INT         NOT NULL REFERENCES padres(id_padre)   ON DELETE CASCADE,
    id_alumno    INT         NOT NULL REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
    parentesco   VARCHAR(20) NOT NULL,
    es_principal BOOLEAN     NOT NULL DEFAULT TRUE,
    UNIQUE (id_padre, id_alumno)
);

-- ============================================================
-- TABLA: grados
-- ============================================================

CREATE TABLE grados (
    id_grado SERIAL PRIMARY KEY,
    nombre   VARCHAR(30) NOT NULL UNIQUE,  -- '1ro Primaria', '5to Secundaria'...
    nivel    VARCHAR(20) NOT NULL,          -- 'Primaria' / 'Secundaria'
    orden    INT         NOT NULL            -- ordenación: 1..11
);

-- ============================================================
-- TABLA: secciones
-- ============================================================

CREATE TABLE secciones (
    id_seccion SERIAL PRIMARY KEY,
    nombre     VARCHAR(5) NOT NULL UNIQUE   -- 'A', 'B', 'C'
);

-- ============================================================
-- TABLA: cursos  (catálogo de materias)
-- ============================================================

CREATE TABLE cursos (
    id_curso SERIAL PRIMARY KEY,
    nombre   VARCHAR(80) NOT NULL,
    area     VARCHAR(60),
    activo   BOOLEAN     NOT NULL DEFAULT TRUE
);

-- ============================================================
-- TABLA: periodos_academicos
-- ============================================================

CREATE TABLE periodos_academicos (
    id_periodo   SERIAL PRIMARY KEY,
    nombre       VARCHAR(20) NOT NULL UNIQUE,  -- '2026-I'
    fecha_inicio DATE        NOT NULL,
    fecha_fin    DATE        NOT NULL,
    activo       BOOLEAN     NOT NULL DEFAULT FALSE
);

-- ============================================================
-- TABLA: aulas  (grado + sección + período = grupo académico)
-- ============================================================

CREATE TABLE aulas (
    id_aula    SERIAL PRIMARY KEY,
    id_grado   INT         NOT NULL REFERENCES grados(id_grado),
    id_seccion INT         NOT NULL REFERENCES secciones(id_seccion),
    id_periodo INT         NOT NULL REFERENCES periodos_academicos(id_periodo),
    turno      VARCHAR(15) NOT NULL DEFAULT 'mañana',
    UNIQUE (id_grado, id_seccion, id_periodo)
);

-- ============================================================
-- TABLA: aula_cursos  (cursos que se dictan en cada aula)
-- ============================================================

CREATE TABLE aula_cursos (
    id_aula_curso SERIAL PRIMARY KEY,
    id_aula       INT NOT NULL REFERENCES aulas(id_aula)   ON DELETE CASCADE,
    id_curso      INT NOT NULL REFERENCES cursos(id_curso) ON DELETE RESTRICT,
    horas_semana  INT NOT NULL DEFAULT 4,
    UNIQUE (id_aula, id_curso)
);

-- ============================================================
-- TABLA: docente_asignaciones  (maestro → aula_curso)
-- ============================================================

CREATE TABLE docente_asignaciones (
    id_asignacion    SERIAL PRIMARY KEY,
    id_aula_curso    INT  NOT NULL REFERENCES aula_cursos(id_aula_curso) ON DELETE CASCADE,
    id_maestro       INT  NOT NULL REFERENCES maestros(id_maestro)      ON DELETE RESTRICT,
    fecha_asignacion DATE NOT NULL DEFAULT CURRENT_DATE,
    activo           BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE (id_aula_curso, id_maestro)
);

-- ============================================================
-- TABLA: matriculas  (alumno → aula, por período)
-- ============================================================

CREATE TABLE matriculas (
    id_matricula    SERIAL PRIMARY KEY,
    id_alumno       INT         NOT NULL REFERENCES alumnos(id_alumno) ON DELETE RESTRICT,
    id_aula         INT         NOT NULL REFERENCES aulas(id_aula)     ON DELETE RESTRICT,
    fecha_matricula DATE        NOT NULL DEFAULT CURRENT_DATE,
    estado          VARCHAR(15) NOT NULL DEFAULT 'activa',  -- activa / retirado / trasladado
    UNIQUE (id_alumno, id_aula)
);

-- ============================================================
-- TABLA: horarios  (bloques horarios por día para cada aula_curso)
-- Cada fila = un bloque de clase en un día concreto.
-- La administración es quien carga y administra estos registros.
-- ============================================================

CREATE TABLE horarios (
    id_horario    SERIAL   PRIMARY KEY,
    id_aula_curso INT      NOT NULL REFERENCES aula_cursos(id_aula_curso) ON DELETE CASCADE,
    dia_semana    SMALLINT NOT NULL CHECK (dia_semana BETWEEN 1 AND 5),
    -- 1=Lunes  2=Martes  3=Miércoles  4=Jueves  5=Viernes
    hora_inicio   TIME     NOT NULL,
    hora_fin      TIME     NOT NULL,
    CONSTRAINT ck_horario_valido CHECK (hora_fin > hora_inicio)
);

-- ============================================================
-- TABLA: espacios_reserva (Catálogo de espacios y límites de tiempo)
-- ============================================================
CREATE TABLE espacios_reserva (
    id_espacio     SERIAL       PRIMARY KEY,
    nombre         VARCHAR(100) NOT NULL UNIQUE,
    area           VARCHAR(60)  NOT NULL, -- 'Matemática', 'Comunicación', 'Ciencias', 'Educación Física', 'Arte', 'General'
    limite_minutos INT          NOT NULL DEFAULT 120
);

-- ============================================================
-- TABLA: reservas_espacio
-- Reservas de espacios (laboratorios, auditorios, salas) que
-- realiza un docente para una clase, reunión de padres, etc.
-- No se pueden superponer reservas del mismo espacio en el mismo
-- horario. Pueden eliminarse por el docente que las creó.
-- ============================================================

CREATE TABLE reservas_espacio (
    id_reserva     SERIAL       PRIMARY KEY,
    id_maestro     INT          NOT NULL REFERENCES maestros(id_maestro) ON DELETE CASCADE,
    espacio        VARCHAR(100) NOT NULL,
    fecha          DATE         NOT NULL,
    hora_inicio    TIME         NOT NULL,
    hora_fin       TIME         NOT NULL,
    id_aula_curso  INT          REFERENCES aula_cursos(id_aula_curso) ON DELETE SET NULL,
    proposito      TEXT,
    fecha_creacion TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_reserva_horario CHECK (hora_fin > hora_inicio)
);

CREATE INDEX idx_reservas_espacio_fecha ON reservas_espacio (espacio, fecha);

-- ============================================================
-- TABLA: comunicados  (anuncios/eventos del docente por grado)
-- El docente crea un comunicado que puede ser para una aula
-- específica (id_aula) o para todas sus aulas (id_aula = NULL).
-- Tipos: examen | actividad | reunion_padres | paseo |
--        dia_festivo | general
-- ============================================================

CREATE TABLE comunicados (
    id_comunicado  SERIAL       PRIMARY KEY,
    id_maestro     INT          NOT NULL REFERENCES maestros(id_maestro) ON DELETE CASCADE,
    id_aula        INT          REFERENCES aulas(id_aula) ON DELETE SET NULL,
    -- NULL = comunicado general para todas las aulas del docente
    titulo         VARCHAR(200) NOT NULL,
    descripcion    TEXT,
    tipo           VARCHAR(30)  NOT NULL DEFAULT 'general',
    fecha_evento   DATE,
    -- fecha del evento (examen, reunión…); NULL si no aplica
    fecha_creacion TIMESTAMP    NOT NULL DEFAULT NOW(),
    hora_evento    TIME
);

-- ============================================================
-- TABLA: materiales_curso  (contenido semanal por aula_curso)
-- El docente organiza el material didáctico por semana y clase.
-- Tipos: pdf | word | video | url | youtube
-- ============================================================

CREATE TABLE materiales_curso (
    id_material    SERIAL       PRIMARY KEY,
    id_aula_curso  INT          NOT NULL REFERENCES aula_cursos(id_aula_curso) ON DELETE CASCADE,
    semana         SMALLINT     NOT NULL DEFAULT 1,
    clase          SMALLINT     NOT NULL DEFAULT 1,
    titulo         VARCHAR(200) NOT NULL,
    tipo           VARCHAR(20)  NOT NULL DEFAULT 'pdf',  -- pdf | word | video | url | youtube
    url            TEXT,        -- enlace externo (url/youtube) o nombre del archivo subido
    contenido_texto TEXT,       -- contenido del material de clase
    fecha_creacion TIMESTAMP    NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_materiales_curso UNIQUE (id_aula_curso, semana, clase, titulo)
);

-- ============================================================
-- TABLA: mensajes  (comunicación padre → maestro)
-- El padre puede asociar un alumno y/o un aula_curso concreto.
-- La administración no interviene; los envía directamente el padre.
-- ============================================================

CREATE TABLE mensajes (
    id_mensaje    SERIAL       PRIMARY KEY,
    id_padre      INT          NOT NULL REFERENCES padres(id_padre)              ON DELETE CASCADE,
    id_maestro    INT          NOT NULL REFERENCES maestros(id_maestro)          ON DELETE RESTRICT,
    id_alumno     INT          REFERENCES alumnos(id_alumno)                     ON DELETE SET NULL,
    id_aula_curso INT          REFERENCES aula_cursos(id_aula_curso)             ON DELETE SET NULL,
    asunto        VARCHAR(200) NOT NULL,
    cuerpo        TEXT         NOT NULL,
    tipo          VARCHAR(20)  NOT NULL DEFAULT 'consulta',
    -- 'justificante' | 'consulta' | 'otro'
    leido         BOOLEAN      NOT NULL DEFAULT FALSE,
    fecha_envio   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABLA: mensajes_respuestas  (hilo de respuestas bidireccional)
-- Tanto el maestro como el padre pueden responder.
-- Se identifica al autor mediante id_usuario.
-- ============================================================

CREATE TABLE mensajes_respuestas (
    id_respuesta SERIAL    PRIMARY KEY,
    id_mensaje   INT       NOT NULL REFERENCES mensajes(id_mensaje) ON DELETE CASCADE,
    id_usuario   INT       NOT NULL REFERENCES usuarios(id_usuario) ON DELETE RESTRICT,
    cuerpo       TEXT      NOT NULL,
    fecha        TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- DATOS DE PRUEBA
-- Contraseñas en texto plano (para referencia del equipo):
--   Maestro  → Test1234!
--   Padre    → Test1234!
--   Alumno 1 → Test1234!
--   Alumno 2 → Test1234!
--   Alumno 3 → Test1234!
--   Admin    → Admin1234!
--
-- IMPORTANTE: Reemplazar los hashes con BCryptPasswordEncoder
-- antes de conectar con Spring Boot.
-- Generar en Java: new BCryptPasswordEncoder().encode("Test1234!")
-- ============================================================

-- ------ usuarios ------
INSERT INTO usuarios (codigo, email, contrasena_hash, rol) VALUES
    -- Maestro
    ('OC16Mar26',      'oscar.castillo@sanagustin.edu.pe',  'HASH_PENDIENTE', 'maestro'),
    -- Padre
    ('PAD-2024-00142', 'marisol.martinez@gmail.com',        'HASH_PENDIENTE', 'padre'),
    -- Alumnos
    ('5B111808',       'juan.martinez@alumnos.sanagustin.edu.pe',   'HASH_PENDIENTE', 'alumno'),
    ('5B111809',       'sofia.martinez@alumnos.sanagustin.edu.pe',  'HASH_PENDIENTE', 'alumno'),
    ('3A110045',       'diego.martinez@alumnos.sanagustin.edu.pe',  'HASH_PENDIENTE', 'alumno'),
    -- Admin
    ('ADM-001',        'admin@sanagustin.edu.pe',           'HASH_PENDIENTE', 'admin');

-- ------ maestros ------
INSERT INTO maestros (id_usuario, nombre, apellido, especialidad, dni, telefono) VALUES
    (1, 'Oscar', 'Castillo', 'Matemáticas', '45678901', '987654321');

-- ------ padres ------
INSERT INTO padres (id_usuario, nombre, apellido, dni, telefono) VALUES
    (2, 'Marisol', 'Martínez', '32165498', '999888777');

-- ------ alumnos ------
INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento) VALUES
    (3, 'Juan',   'Martínez', '5to Secundaria', 'B', '2008-03-15'),
    (4, 'Sofía',  'Martínez', '3ro Secundaria', 'A', '2010-07-22'),
    (5, 'Diego',  'Martínez', '1ro Primaria',   'A', '2018-11-05');

-- ------ padre_hijo ------
INSERT INTO padre_hijo (id_padre, id_alumno, parentesco, es_principal) VALUES
    (1, 1, 'madre', TRUE),
    (1, 2, 'madre', TRUE),
    (1, 3, 'madre', TRUE);

-- ------ grados ------
INSERT INTO grados (nombre, nivel, orden) VALUES
    ('1ro Primaria',   'Primaria',    1),
    ('2do Primaria',   'Primaria',    2),
    ('3ro Primaria',   'Primaria',    3),
    ('4to Primaria',   'Primaria',    4),
    ('5to Primaria',   'Primaria',    5),
    ('6to Primaria',   'Primaria',    6),
    ('1ro Secundaria', 'Secundaria',  7),
    ('2do Secundaria', 'Secundaria',  8),
    ('3ro Secundaria', 'Secundaria',  9),
    ('4to Secundaria', 'Secundaria', 10),
    ('5to Secundaria', 'Secundaria', 11);

-- ------ secciones ------
INSERT INTO secciones (nombre) VALUES ('A'), ('B'), ('C');

-- ------ cursos ------
INSERT INTO cursos (nombre, area) VALUES
    ('Matemática',                    'Matemática'),
    ('Comunicación',                  'Comunicación'),
    ('Ciencia y Tecnología',          'Ciencias'),
    ('Historia, Geografía y Economía','Sociales'),
    ('Inglés',                        'Idiomas'),
    ('Arte y Cultura',                'Arte'),
    ('Educación Física',              'Educación Física'),
    ('Personal Social',               'Sociales'),
    ('Religión',                      'Formación');

-- ------ periodos_academicos ------
INSERT INTO periodos_academicos (nombre, fecha_inicio, fecha_fin, activo) VALUES
    ('2026-I', '2026-03-01', '2026-11-28', TRUE);

-- ------ aulas ------
-- aula 1: 5to Secundaria B  (grado=11, seccion=2, periodo=1)
-- aula 2: 3ro Secundaria A  (grado= 9, seccion=1, periodo=1)
-- aula 3: 1ro Primaria    A  (grado= 1, seccion=1, periodo=1)
INSERT INTO aulas (id_grado, id_seccion, id_periodo, turno) VALUES
    (11, 2, 1, 'mañana'),
    ( 9, 1, 1, 'mañana'),
    ( 1, 1, 1, 'mañana');

-- ------ aula_cursos ------
-- 5to Secundaria B (id_aula=1): ids 1-8
INSERT INTO aula_cursos (id_aula, id_curso, horas_semana) VALUES
    (1, 1, 5), -- Matemática
    (1, 2, 5), -- Comunicación
    (1, 3, 4), -- Ciencia y Tecnología
    (1, 4, 4), -- Historia
    (1, 5, 4), -- Inglés
    (1, 6, 2), -- Arte y Cultura
    (1, 7, 2), -- Educación Física
    (1, 9, 2); -- Religión

-- 3ro Secundaria A (id_aula=2): ids 9-16
INSERT INTO aula_cursos (id_aula, id_curso, horas_semana) VALUES
    (2, 1, 5), -- Matemática
    (2, 2, 5), -- Comunicación
    (2, 3, 4), -- Ciencia y Tecnología
    (2, 4, 4), -- Historia
    (2, 5, 4), -- Inglés
    (2, 6, 2), -- Arte y Cultura
    (2, 7, 2), -- Educación Física
    (2, 9, 2); -- Religión

-- 1ro Primaria A (id_aula=3): ids 17-22
INSERT INTO aula_cursos (id_aula, id_curso, horas_semana) VALUES
    (3, 1, 5), -- Matemática
    (3, 2, 6), -- Comunicación
    (3, 8, 4), -- Personal Social
    (3, 6, 2), -- Arte y Cultura
    (3, 7, 2), -- Educación Física
    (3, 9, 2); -- Religión

-- ------ usuarios adicionales (docentes 2-6) ------
INSERT INTO usuarios (codigo, email, contrasena_hash, rol, activo) VALUES
    ('MG21Abr90', 'maria.gonzalez@sanagustin.edu.pe',   'HASH_PENDIENTE', 'maestro', TRUE),
    ('CM15Ene85', 'carlos.mendoza@sanagustin.edu.pe',   'HASH_PENDIENTE', 'maestro', TRUE),
    ('AF20Abr92', 'ana.flores@sanagustin.edu.pe',       'HASH_PENDIENTE', 'maestro', TRUE),
    ('LR10Mar88', 'luis.ramirez@sanagustin.edu.pe',     'HASH_PENDIENTE', 'maestro', TRUE),
    ('PS05Jun91', 'patricia.salazar@sanagustin.edu.pe', 'HASH_PENDIENTE', 'maestro', TRUE);

-- ------ maestros adicionales ------
INSERT INTO maestros (id_usuario, nombre, apellido, especialidad, dni, telefono) VALUES
    (7,  'María',    'González', 'Comunicación',     '71234567', '987654320'),
    (8,  'Carlos',   'Mendoza',  'Ciencias',         '72345678', '976543211'),
    (9,  'Ana',      'Flores',   'Idiomas',          '73456789', '965432102'),
    (10, 'Luis',     'Ramírez',  'Educación Física', '74567890', '954321093'),
    (11, 'Patricia', 'Salazar',  'Arte y Cultura',   '75678901', '943210984');

-- ------ docente_asignaciones ------
-- Oscar (id_maestro=1) → Matemática en las 3 aulas
-- María (2) → Comunicación | Carlos (3) → Ciencia/Historia | Ana (4) → Inglés
-- Luis (5) → Ed.Física/Religión | Patricia (6) → Arte/Personal Social
INSERT INTO docente_asignaciones (id_aula_curso, id_maestro, fecha_asignacion, activo) VALUES
    -- Matemática – Oscar (todas las aulas)
    ( 1, 1, '2026-03-01', TRUE),
    ( 9, 1, '2026-03-01', TRUE),
    (17, 1, '2026-03-01', TRUE),
    -- Comunicación – María
    ( 2, 2, '2026-03-01', TRUE),
    (10, 2, '2026-03-01', TRUE),
    (18, 2, '2026-03-01', TRUE),
    -- Ciencia y Tecnología – Carlos
    ( 3, 3, '2026-03-01', TRUE),
    (11, 3, '2026-03-01', TRUE),
    -- Historia, Geografía y Economía – Carlos
    ( 4, 3, '2026-03-01', TRUE),
    (12, 3, '2026-03-01', TRUE),
    -- Inglés – Ana
    ( 5, 4, '2026-03-01', TRUE),
    (13, 4, '2026-03-01', TRUE),
    -- Arte y Cultura – Patricia
    ( 6, 6, '2026-03-01', TRUE),
    (14, 6, '2026-03-01', TRUE),
    (20, 6, '2026-03-01', TRUE),
    -- Educación Física – Luis
    ( 7, 5, '2026-03-01', TRUE),
    (15, 5, '2026-03-01', TRUE),
    (21, 5, '2026-03-01', TRUE),
    -- Religión – Luis
    ( 8, 5, '2026-03-01', TRUE),
    (16, 5, '2026-03-01', TRUE),
    (22, 5, '2026-03-01', TRUE),
    -- Personal Social – Patricia (solo 1ro Prim A)
    (19, 6, '2026-03-01', TRUE);

-- ------ matriculas (alumnos iniciales) ------
INSERT INTO matriculas (id_alumno, id_aula, fecha_matricula, estado) VALUES
    (1, 1, '2026-03-01', 'activa'),  -- Juan   → 5to Sec B
    (2, 2, '2026-03-01', 'activa'),  -- Sofía  → 3ro Sec A
    (3, 3, '2026-03-01', 'activa');  -- Diego  → 1ro Prim A

-- ============================================================
-- EXPANSIÓN: Aulas para todos los grados (sección A, 2026-I)
-- Un alumno de prueba por grado. Contraseña: Test1234!
-- ============================================================

-- ------ aulas adicionales ------
-- aula  4: 2do Primaria A  (grado=2,  sec=1, per=1)
-- aula  5: 3ro Primaria A  (grado=3,  sec=1, per=1)
-- aula  6: 4to Primaria A  (grado=4,  sec=1, per=1)
-- aula  7: 5to Primaria A  (grado=5,  sec=1, per=1)
-- aula  8: 6to Primaria A  (grado=6,  sec=1, per=1)
-- aula  9: 1ro Secundaria A(grado=7,  sec=1, per=1)
-- aula 10: 2do Secundaria A(grado=8,  sec=1, per=1)
-- aula 11: 4to Secundaria A(grado=10, sec=1, per=1)
-- aula 12: 5to Secundaria A(grado=11, sec=1, per=1)
INSERT INTO aulas (id_grado, id_seccion, id_periodo, turno) VALUES
    ( 2, 1, 1, 'mañana'),
    ( 3, 1, 1, 'mañana'),
    ( 4, 1, 1, 'mañana'),
    ( 5, 1, 1, 'mañana'),
    ( 6, 1, 1, 'mañana'),
    ( 7, 1, 1, 'mañana'),
    ( 8, 1, 1, 'mañana'),
    (10, 1, 1, 'mañana'),
    (11, 1, 1, 'mañana');

-- ------ aula_cursos para nuevas aulas ------
-- cursos: Mat=1 Com=2 Cie=3 His=4 Ing=5 Art=6 EFi=7 PSo=8 Rel=9
-- 2do Primaria A (aula 4): 6 cursos
INSERT INTO aula_cursos (id_aula, id_curso, horas_semana) VALUES
    (4,1,5),(4,2,6),(4,8,4),(4,6,2),(4,7,2),(4,9,2);
-- 3ro-6to Primaria A (aulas 5-8): 7 cursos (agrega Ciencia y Tecnología)
INSERT INTO aula_cursos (id_aula, id_curso, horas_semana) VALUES
    (5,1,5),(5,2,6),(5,3,4),(5,8,4),(5,6,2),(5,7,2),(5,9,2),
    (6,1,5),(6,2,6),(6,3,4),(6,8,4),(6,6,2),(6,7,2),(6,9,2),
    (7,1,5),(7,2,6),(7,3,4),(7,8,4),(7,6,2),(7,7,2),(7,9,2),
    (8,1,5),(8,2,6),(8,3,4),(8,8,4),(8,6,2),(8,7,2),(8,9,2);
-- 1ro-2do-4to-5to Secundaria A (aulas 9-12): 8 cursos
INSERT INTO aula_cursos (id_aula, id_curso, horas_semana) VALUES
    ( 9,1,5),( 9,2,5),( 9,3,4),( 9,4,4),( 9,5,4),( 9,6,2),( 9,7,2),( 9,9,2),
    (10,1,5),(10,2,5),(10,3,4),(10,4,4),(10,5,4),(10,6,2),(10,7,2),(10,9,2),
    (11,1,5),(11,2,5),(11,3,4),(11,4,4),(11,5,4),(11,6,2),(11,7,2),(11,9,2),
    (12,1,5),(12,2,5),(12,3,4),(12,4,4),(12,5,4),(12,6,2),(12,7,2),(12,9,2);

-- ------ docente_asignaciones para nuevas aulas ------
-- maestros (fresh install, IDs consecutivos 1-6):
--   Oscar=1 Maria=2 Carlos=3 Ana=4 Luis=5 Patricia=6
-- Oscar → Matematica (todas las nuevas aulas)
INSERT INTO docente_asignaciones (id_aula_curso, id_maestro, fecha_asignacion, activo)
SELECT ac.id_aula_curso, 1, '2026-03-01', TRUE
FROM aula_cursos ac WHERE ac.id_aula IN (4,5,6,7,8,9,10,11,12) AND ac.id_curso = 1;
-- Maria → Comunicacion (todas las nuevas aulas)
INSERT INTO docente_asignaciones (id_aula_curso, id_maestro, fecha_asignacion, activo)
SELECT ac.id_aula_curso, 2, '2026-03-01', TRUE
FROM aula_cursos ac WHERE ac.id_aula IN (4,5,6,7,8,9,10,11,12) AND ac.id_curso = 2;
-- Carlos → Ciencia y Tecnologia (3ro Prim - 5to Sec) + Historia GE (secundaria)
INSERT INTO docente_asignaciones (id_aula_curso, id_maestro, fecha_asignacion, activo)
SELECT ac.id_aula_curso, 3, '2026-03-01', TRUE
FROM aula_cursos ac WHERE ac.id_aula IN (5,6,7,8,9,10,11,12) AND ac.id_curso = 3;
INSERT INTO docente_asignaciones (id_aula_curso, id_maestro, fecha_asignacion, activo)
SELECT ac.id_aula_curso, 3, '2026-03-01', TRUE
FROM aula_cursos ac WHERE ac.id_aula IN (9,10,11,12) AND ac.id_curso = 4;
-- Ana → Ingles (secundaria)
INSERT INTO docente_asignaciones (id_aula_curso, id_maestro, fecha_asignacion, activo)
SELECT ac.id_aula_curso, 4, '2026-03-01', TRUE
FROM aula_cursos ac WHERE ac.id_aula IN (9,10,11,12) AND ac.id_curso = 5;
-- Patricia → Arte y Cultura (todas) + Personal Social (primaria)
INSERT INTO docente_asignaciones (id_aula_curso, id_maestro, fecha_asignacion, activo)
SELECT ac.id_aula_curso, 6, '2026-03-01', TRUE
FROM aula_cursos ac WHERE ac.id_aula IN (4,5,6,7,8,9,10,11,12) AND ac.id_curso = 6;
INSERT INTO docente_asignaciones (id_aula_curso, id_maestro, fecha_asignacion, activo)
SELECT ac.id_aula_curso, 6, '2026-03-01', TRUE
FROM aula_cursos ac WHERE ac.id_aula IN (4,5,6,7,8) AND ac.id_curso = 8;
-- Luis → Educacion Fisica + Religion (todas las nuevas aulas)
INSERT INTO docente_asignaciones (id_aula_curso, id_maestro, fecha_asignacion, activo)
SELECT ac.id_aula_curso, 5, '2026-03-01', TRUE
FROM aula_cursos ac WHERE ac.id_aula IN (4,5,6,7,8,9,10,11,12) AND ac.id_curso IN (7,9);

-- ------ usuarios adicionales: alumnos de prueba ------
INSERT INTO usuarios (codigo, email, contrasena_hash, rol, activo) VALUES
    ('2A261001', 'carlos.huanca@alumnos.sanagustin.edu.pe',   'HASH_PENDIENTE', 'alumno', TRUE),
    ('3A261002', 'lucia.quispe@alumnos.sanagustin.edu.pe',    'HASH_PENDIENTE', 'alumno', TRUE),
    ('4A261003', 'miguel.torres@alumnos.sanagustin.edu.pe',   'HASH_PENDIENTE', 'alumno', TRUE),
    ('5A261004', 'andrea.silva@alumnos.sanagustin.edu.pe',    'HASH_PENDIENTE', 'alumno', TRUE),
    ('6A261005', 'kevin.paredes@alumnos.sanagustin.edu.pe',   'HASH_PENDIENTE', 'alumno', TRUE),
    ('1S261006', 'camila.rojas@alumnos.sanagustin.edu.pe',    'HASH_PENDIENTE', 'alumno', TRUE),
    ('2S261007', 'renzo.mendez@alumnos.sanagustin.edu.pe',    'HASH_PENDIENTE', 'alumno', TRUE),
    ('4S261008', 'valeria.castro@alumnos.sanagustin.edu.pe',  'HASH_PENDIENTE', 'alumno', TRUE),
    ('5S261009', 'fabian.gutierrez@alumnos.sanagustin.edu.pe','HASH_PENDIENTE', 'alumno', TRUE);

-- ------ alumnos adicionales ------
INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento) VALUES
    ((SELECT id_usuario FROM usuarios WHERE codigo='2A261001'), 'Carlos',  'Huanca',    '2do Primaria',   'A', '2016-05-12'),
    ((SELECT id_usuario FROM usuarios WHERE codigo='3A261002'), 'Lucia',   'Quispe',    '3ro Primaria',   'A', '2015-08-20'),
    ((SELECT id_usuario FROM usuarios WHERE codigo='4A261003'), 'Miguel',  'Torres',    '4to Primaria',   'A', '2014-03-07'),
    ((SELECT id_usuario FROM usuarios WHERE codigo='5A261004'), 'Andrea',  'Silva',     '5to Primaria',   'A', '2013-11-30'),
    ((SELECT id_usuario FROM usuarios WHERE codigo='6A261005'), 'Kevin',   'Paredes',   '6to Primaria',   'A', '2012-02-18'),
    ((SELECT id_usuario FROM usuarios WHERE codigo='1S261006'), 'Camila',  'Rojas',     '1ro Secundaria', 'A', '2011-09-25'),
    ((SELECT id_usuario FROM usuarios WHERE codigo='2S261007'), 'Renzo',   'Mendez',    '2do Secundaria', 'A', '2010-04-14'),
    ((SELECT id_usuario FROM usuarios WHERE codigo='4S261008'), 'Valeria', 'Castro',    '4to Secundaria', 'A', '2008-07-03'),
    ((SELECT id_usuario FROM usuarios WHERE codigo='5S261009'), 'Fabian',  'Gutierrez', '5to Secundaria', 'A', '2007-12-22');

-- ------ matriculas adicionales ------
INSERT INTO matriculas (id_alumno, id_aula, fecha_matricula, estado)
SELECT al.id_alumno, a.id_aula, '2026-03-01', 'activa'
FROM alumnos al
JOIN usuarios u   ON u.id_usuario  = al.id_usuario
JOIN grados g     ON g.nombre      = al.grado
JOIN secciones s  ON s.nombre      = al.seccion
JOIN periodos_academicos p ON p.nombre = '2026-I'
JOIN aulas a ON a.id_grado = g.id_grado AND a.id_seccion = s.id_seccion AND a.id_periodo = p.id_periodo
WHERE u.codigo IN ('2A261001','3A261002','4A261003','5A261004','6A261005',
                   '1S261006','2S261007','4S261008','5S261009');

-- ============================================================
-- HORARIOS DE PRUEBA: Oscar Castillo (Matemática, aulas 1-3)
-- 5to Sec B = aula 1 | 3ro Sec A = aula 2 | 1ro Prim A = aula 3
-- La columna id_aula_curso se obtiene con subqueries para evitar
-- depender de IDs fijos que podrían variar entre instalaciones.
-- ============================================================

INSERT INTO horarios (id_aula_curso, dia_semana, hora_inicio, hora_fin) VALUES
    -- ── 5to Secundaria B  (Matemática, 5 h/sem) ──
    ((SELECT id_aula_curso FROM aula_cursos WHERE id_aula=1 AND id_curso=1), 1, '07:30', '09:00'),  -- Lunes
    ((SELECT id_aula_curso FROM aula_cursos WHERE id_aula=1 AND id_curso=1), 2, '10:00', '11:00'),  -- Martes
    ((SELECT id_aula_curso FROM aula_cursos WHERE id_aula=1 AND id_curso=1), 4, '07:30', '09:00'),  -- Jueves
    -- ── 3ro Secundaria A  (Matemática, 5 h/sem) ──
    ((SELECT id_aula_curso FROM aula_cursos WHERE id_aula=2 AND id_curso=1), 1, '10:00', '11:30'),  -- Lunes
    ((SELECT id_aula_curso FROM aula_cursos WHERE id_aula=2 AND id_curso=1), 3, '07:30', '09:00'),  -- Miércoles
    ((SELECT id_aula_curso FROM aula_cursos WHERE id_aula=2 AND id_curso=1), 5, '10:00', '11:00'),  -- Viernes
    -- ── 1ro Primaria A    (Matemática, 5 h/sem) ──
    ((SELECT id_aula_curso FROM aula_cursos WHERE id_aula=3 AND id_curso=1), 2, '07:30', '09:00'),  -- Martes
    ((SELECT id_aula_curso FROM aula_cursos WHERE id_aula=3 AND id_curso=1), 3, '10:00', '11:00'),  -- Miércoles
    ((SELECT id_aula_curso FROM aula_cursos WHERE id_aula=3 AND id_curso=1), 5, '07:30', '08:30');  -- Viernes

-- ============================================================
-- MENSAJES DE PRUEBA: Marisol → Oscar Castillo
-- Marisol es madre de Juan (5to Sec B), Sofía (3ro Sec A) y
-- Diego (1ro Prim A), los tres alumnos de Oscar.
-- ============================================================

INSERT INTO mensajes (id_padre, id_maestro, id_alumno, id_aula_curso, asunto, cuerpo, tipo, leido, fecha_envio)
VALUES
    -- Mensaje 1 (sin leer): justificante médico de Juan
    (
        (SELECT p.id_padre FROM padres p JOIN usuarios u ON u.id_usuario=p.id_usuario WHERE u.codigo='PAD-2024-00142'),
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        (SELECT id_alumno FROM alumnos WHERE nombre='Juan' AND apellido='Martínez'),
        (SELECT id_aula_curso FROM aula_cursos WHERE id_aula=1 AND id_curso=1),
        'Justificante de inasistencia - Juan Martínez',
        'Estimado profesor Castillo, le informo que mi hijo Juan no pudo asistir el día lunes 19 de mayo debido a una consulta médica. Adjunto el certificado del médico para su conocimiento. Quedo atenta a cualquier tarea o avance que haya perdido. Muchas gracias.',
        'justificante', FALSE, NOW() - INTERVAL '2 hours'
    ),
    -- Mensaje 2 (sin leer): consulta sobre examen de Sofía
    (
        (SELECT p.id_padre FROM padres p JOIN usuarios u ON u.id_usuario=p.id_usuario WHERE u.codigo='PAD-2024-00142'),
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        (SELECT id_alumno FROM alumnos WHERE nombre='Sofía' AND apellido='Martínez'),
        (SELECT id_aula_curso FROM aula_cursos WHERE id_aula=2 AND id_curso=1),
        'Consulta sobre fecha de examen de Matemática - 3ro A',
        'Profesor Oscar, buenos días. Le escribo para consultar cuándo será el próximo examen de matemática de 3ro A. Mi hija Sofía me comentó que no tiene muy claro la fecha y quiero organizarle sus repasas en casa. Agradecería también si pudiera indicarme los temas que entrarán. Gracias.',
        'consulta', FALSE, NOW() - INTERVAL '5 hours'
    ),
    -- Mensaje 3 (leído, con respuesta): justificante de Diego
    (
        (SELECT p.id_padre FROM padres p JOIN usuarios u ON u.id_usuario=p.id_usuario WHERE u.codigo='PAD-2024-00142'),
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        (SELECT id_alumno FROM alumnos WHERE nombre='Diego' AND apellido='Martínez'),
        (SELECT id_aula_curso FROM aula_cursos WHERE id_aula=3 AND id_curso=1),
        'Ausencia justificada - Diego Martínez',
        'Estimado profesor, le comunico que Diego estuvo con fiebre los días 15 y 16 de mayo. Le adjunto el descanso médico emitido por el pediatra del centro de salud San Agustín. Por favor, indíqueme qué temas debo reforzar con él en casa para que no se atrase. Gracias por su comprensión.',
        'justificante', TRUE, NOW() - INTERVAL '2 days'
    ),
    -- Mensaje 4 (leído, sin respuesta): consulta general
    (
        (SELECT p.id_padre FROM padres p JOIN usuarios u ON u.id_usuario=p.id_usuario WHERE u.codigo='PAD-2024-00142'),
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        (SELECT id_alumno FROM alumnos WHERE nombre='Juan' AND apellido='Martínez'),
        (SELECT id_aula_curso FROM aula_cursos WHERE id_aula=1 AND id_curso=1),
        'Consulta sobre material de refuerzo para fracciones',
        'Profesor, buenas tardes. Juan está teniendo algunas dificultades con el tema de fracciones equivalentes. ¿Podría recomendarme algún material de práctica adicional o ejercicios que pueda hacer en casa? Le agradecería mucho. Atentamente, Marisol.',
        'consulta', TRUE, NOW() - INTERVAL '4 days'
    );

-- Respuesta del docente al mensaje 3 (Diego - justificante)
INSERT INTO mensajes_respuestas (id_mensaje, id_usuario, cuerpo, fecha)
VALUES (
    3,
    (SELECT id_usuario FROM usuarios WHERE codigo='OC16Mar26'),
    'Estimada señora Marisol, recibí el justificante de Diego. Los temas vistos durante su ausencia fueron: operaciones con decimales (lección 8) y resolución de problemas con regla de tres simple. Le sugiero que practique los ejercicios del libro de texto páginas 54-58. Cualquier duda estoy disponible. Saludos.',
    NOW() - INTERVAL '1 day'
);

-- ============================================================
-- COMUNICADOS DE PRUEBA: Oscar Castillo
-- aula 1 = 5to Sec B  |  aula 2 = 3ro Sec A  |  aula 3 = 1ro Prim A
-- ============================================================

INSERT INTO comunicados (id_maestro, id_aula, titulo, descripcion, tipo, fecha_evento, fecha_creacion)
VALUES
    -- Examen específico para 5to Sec B
    (
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        1,
        'Evaluación de operaciones con decimales',
        'Se evaluarán los temas de la lección 7, 8 y 9: suma y resta de decimales, multiplicación y división. Se permite calculadora. Duración: 90 minutos.',
        'examen',
        CURRENT_DATE + INTERVAL '4 days',
        NOW() - INTERVAL '1 day'
    ),
    -- Reunión de padres para todas las aulas (id_aula = NULL)
    (
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        NULL,
        'Reunión de padres de familia – Fin de bimestre',
        'Se les convoca a la reunión de padres para informar sobre el avance académico del primer bimestre. Se entregará el reporte de calificaciones parciales. Favor de llegar puntual.',
        'reunion_padres',
        CURRENT_DATE + INTERVAL '9 days',
        NOW() - INTERVAL '3 hours'
    ),
    -- Actividad en aula para 3ro Sec A
    (
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        2,
        'Actividad grupal: resolución de problemas de regla de tres',
        'Los alumnos trabajarán en equipos de 4 para resolver un set de 10 problemas aplicados. Cada equipo presentará su solución al final de la clase. Materiales: lápiz, regla, calculadora.',
        'actividad',
        CURRENT_DATE + INTERVAL '2 days',
        NOW() - INTERVAL '6 hours'
    ),
    -- Paseo escolar para 1ro Prim A
    (
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        3,
        'Paseo escolar al Parque de las Leyendas',
        'Salida a las 8:00 am desde el colegio. Los alumnos deberán traer lonchera, agua y usar ropa cómoda con el uniforme deportivo. El regreso está programado para las 3:00 pm.',
        'paseo',
        CURRENT_DATE + INTERVAL '14 days',
        NOW() - INTERVAL '2 hours'
    ),
    -- Día festivo general (todas las aulas)
    (
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        NULL,
        'No hay clases – Día del Maestro',
        'Con motivo del Día del Maestro Peruano, no habrá clases ese día. Las actividades se reanudan con normalidad al día siguiente.',
        'dia_festivo',
        CURRENT_DATE + INTERVAL '6 days',
        NOW() - INTERVAL '1 hour'
    );

-- ============================================================
-- MATERIALES DE PRUEBA: Oscar Castillo — Matemática
-- id_aula_curso=1 → 5to Sec B  |  id_aula_curso=9 → 3ro Sec A
-- id_aula_curso=17 → 1ro Prim A
-- ============================================================

INSERT INTO materiales_curso (id_aula_curso, semana, clase, titulo, tipo, url, fecha_creacion) VALUES
    -- 5to Sec B — Semana 1, Clase 1
    (1, 1, 1, 'Números enteros: concepto y clasificación',  'pdf',     'http://localhost:8080/material/numeros_enteros.pdf', NOW() - INTERVAL '20 days'),
    (1, 1, 1, 'Ejercicios de práctica N°1',                'pdf',     'http://localhost:8080/material/ejercicios_enteros.pdf', NOW() - INTERVAL '19 days'),
    -- 5to Sec B — Semana 1, Clase 2
    (1, 1, 2, 'Video: Operaciones con enteros',            'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', NOW() - INTERVAL '18 days'),
    (1, 1, 2, 'Recurso interactivo - GeoGebra',           'url',     'https://www.geogebra.org', NOW() - INTERVAL '17 days'),
    -- 5to Sec B — Semana 2, Clase 1
    (1, 2, 1, 'Decimales: concepto, tipos y escritura',    'pdf',     'http://localhost:8080/material/decimales_teoria.pdf', NOW() - INTERVAL '13 days'),
    (1, 2, 1, 'Guía de trabajo: decimales',                'word',    'http://localhost:8080/material/guia_decimales.docx', NOW() - INTERVAL '12 days'),
    -- 5to Sec B — Semana 2, Clase 2
    (1, 2, 2, 'Operaciones con decimales – suma y resta',  'pdf',     'http://localhost:8080/material/operaciones_decimales.pdf', NOW() - INTERVAL '11 days'),
    -- 5to Sec B — Semana 3, Clase 1
    (1, 3, 1, 'Fracciones: concepto y tipos',              'pdf',     'http://localhost:8080/material/fracciones_concepto.pdf', NOW() - INTERVAL '6 days'),
    (1, 3, 1, 'Video: Fracciones equivalentes',            'youtube', 'https://www.youtube.com/watch?v=example1', NOW() - INTERVAL '5 days'),
    -- 3ro Sec A — Semana 1, Clase 1
    (9, 1, 1, 'Introducción al álgebra',                   'pdf',     'http://localhost:8080/material/introduccion_algebra.pdf', NOW() - INTERVAL '20 days'),
    (9, 1, 1, 'Ejercicios de expresiones algebraicas',    'pdf',     'http://localhost:8080/material/ejercicios_algebra.pdf', NOW() - INTERVAL '19 days'),
    -- 3ro Sec A — Semana 1, Clase 2
    (9, 1, 2, 'Ecuaciones de primer grado',                'pdf',     'http://localhost:8080/material/ecuaciones_primer_grado.pdf', NOW() - INTERVAL '17 days'),
    (9, 1, 2, 'Tutorial interactivo - ecuaciones',         'url',     'https://www.khanacademy.org', NOW() - INTERVAL '16 days'),
    -- 3ro Sec A — Semana 2, Clase 1
    (9, 2, 1, 'Sistemas de ecuaciones',                    'pdf',     'http://localhost:8080/material/sistemas_ecuaciones.pdf', NOW() - INTERVAL '10 days'),
    -- 1ro Prim A — Semana 1, Clase 1
    (17, 1, 1, 'Números del 1 al 10',                     'pdf',     'http://localhost:8080/material/numeros_1_10.pdf', NOW() - INTERVAL '20 days'),
    (17, 1, 1, 'Video: Contando con deditos',             'youtube', 'https://www.youtube.com/watch?v=example2', NOW() - INTERVAL '19 days'),
    -- 1ro Prim A — Semana 1, Clase 2
    (17, 1, 2, 'Suma y resta básica',                     'pdf',     'http://localhost:8080/material/suma_resta_basica.pdf', NOW() - INTERVAL '17 days');

-- ------ espacios_reserva ------
INSERT INTO espacios_reserva (nombre, area, limite_minutos) VALUES
    ('Lab. de Computación A', 'Matemática', 90),
    ('Lab. de Computación B', 'Matemática', 90),
    ('Biblioteca Principal',  'Comunicación', 120),
    ('Aula de Debate',        'Comunicación', 60),
    ('Lab. Ciencias A',       'Ciencias', 120),
    ('Lab. Ciencias B',       'Ciencias', 120),
    ('Losa Deportiva Norte',  'Educación Física', 90),
    ('Gimnasio Cubierto',    'Educación Física', 90),
    ('Taller de Arte',        'Arte', 120),
    ('Salón de Música',       'Arte', 60),
    ('Auditorio Principal',   'General', 180),
    ('Sala de Reuniones',     'General', 60);

-- ═══════════════════════════════════════════════════════════════
--  FASE II: Tablas del portal del alumno (detalle de curso)
-- ═══════════════════════════════════════════════════════════════

-- TABLA: tareas_curso  (Tareas / trabajos creados por el docente)
CREATE TABLE IF NOT EXISTS tareas_curso (
    id_tarea        BIGSERIAL PRIMARY KEY,
    id_aula_curso   BIGINT        NOT NULL REFERENCES aula_cursos(id_aula_curso) ON DELETE CASCADE,
    numero_tarea    INTEGER       NOT NULL DEFAULT 1,
    semana          INTEGER       NOT NULL DEFAULT 1,
    clase           INTEGER       NOT NULL DEFAULT 1,
    titulo          VARCHAR(200)  NOT NULL,
    descripcion     TEXT,
    tipo_entregable VARCHAR(50),                        -- 'archivo' | 'url' | 'texto' | 'ninguno'
    fecha_entrega   DATE,
    nota_maxima     INTEGER       NOT NULL DEFAULT 20,
    intentos        INTEGER       NOT NULL DEFAULT 1,
    url             TEXT,
    fecha_creacion  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tarea_curso UNIQUE (id_aula_curso, semana, clase, titulo)
);

-- TABLA: notas_tarea  (Calificaciones individuales por tarea)
CREATE TABLE IF NOT EXISTS notas_tarea (
    id_nota         BIGSERIAL PRIMARY KEY,
    id_tarea        BIGINT      NOT NULL REFERENCES tareas_curso(id_tarea) ON DELETE CASCADE,
    id_alumno       BIGINT      NOT NULL REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
    entregado       BOOLEAN     NOT NULL DEFAULT FALSE,
    nota            NUMERIC(5,2),
    fecha_entrega   TIMESTAMPTZ,
    url_entrega     TEXT,
    UNIQUE (id_tarea, id_alumno)
);

-- TABLA: examenes_curso  (Exámenes / evaluaciones del docente)
CREATE TABLE IF NOT EXISTS examenes_curso (
    id_examen       BIGSERIAL PRIMARY KEY,
    id_aula_curso   BIGINT       NOT NULL REFERENCES aula_cursos(id_aula_curso) ON DELETE CASCADE,
    numero_examen   INTEGER      NOT NULL DEFAULT 1,
    semana          INTEGER      NOT NULL DEFAULT 1,
    clase           INTEGER      NOT NULL DEFAULT 1,
    titulo          VARCHAR(200) NOT NULL,
    descripcion     TEXT,
    tipo            VARCHAR(30)  NOT NULL DEFAULT 'escrito',  -- escrito | oral | online | practico
    fecha_examen    DATE,
    duracion_minutos INTEGER,
    nota_maxima     INTEGER      NOT NULL DEFAULT 20,
    url             TEXT,
    fecha_creacion  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_examen_curso UNIQUE (id_aula_curso, semana, clase, titulo)
);

-- TABLA: notas_examen  (Calificaciones individuales de exámenes)
CREATE TABLE IF NOT EXISTS notas_examen (
    id_nota_examen  BIGSERIAL PRIMARY KEY,
    id_examen       BIGINT      NOT NULL REFERENCES examenes_curso(id_examen) ON DELETE CASCADE,
    id_alumno       BIGINT      NOT NULL REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
    asistio         BOOLEAN     NOT NULL DEFAULT TRUE,
    nota            NUMERIC(5,2),
    UNIQUE (id_examen, id_alumno)
);

-- TABLA: asistencia_alumno  (Registro de asistencia por clase)
CREATE TABLE IF NOT EXISTS asistencia_alumno (
    id_asistencia   BIGSERIAL PRIMARY KEY,
    id_alumno       BIGINT      NOT NULL REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
    id_aula_curso   BIGINT      NOT NULL REFERENCES aula_cursos(id_aula_curso) ON DELETE CASCADE,
    fecha           DATE        NOT NULL,
    estado          VARCHAR(20) NOT NULL DEFAULT 'presente',  -- presente | falta | tardanza | justificado
    justificante    TEXT,
    UNIQUE (id_alumno, id_aula_curso, fecha)
);

-- TABLA: reportes_alumno  (Reportes / anotaciones del docente sobre un alumno)
CREATE TABLE IF NOT EXISTS reportes_alumno (
    id_reporte      BIGSERIAL PRIMARY KEY,
    id_alumno       BIGINT      NOT NULL REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
    id_aula_curso   BIGINT      NOT NULL REFERENCES aula_cursos(id_aula_curso) ON DELETE CASCADE,
    id_maestro      BIGINT      NOT NULL REFERENCES maestros(id_maestro) ON DELETE CASCADE,
    tipo            VARCHAR(30) NOT NULL DEFAULT 'anotacion',  -- pendiente | anotacion | llamada_atencion | felicitacion | otro
    titulo          VARCHAR(200) NOT NULL,
    descripcion     TEXT,
    fecha           DATE        NOT NULL DEFAULT CURRENT_DATE,
    visible_padre   BOOLEAN     NOT NULL DEFAULT TRUE,
    fecha_creacion  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Limpiar tareas, exámenes y notas previas de estos cursos para evitar conflictos de claves únicas
DO $$
DECLARE
    v_juan_id INT;
BEGIN
    SELECT a.id_alumno INTO v_juan_id FROM alumnos a JOIN usuarios u ON u.id_usuario = a.id_usuario WHERE u.codigo = '5B111808';
    IF v_juan_id IS NOT NULL THEN
        DELETE FROM notas_tarea WHERE id_alumno = v_juan_id AND id_tarea IN (SELECT id_tarea FROM tareas_curso WHERE id_aula_curso BETWEEN 1 AND 8);
        DELETE FROM notas_examen WHERE id_alumno = v_juan_id AND id_examen IN (SELECT id_examen FROM examenes_curso WHERE id_aula_curso BETWEEN 1 AND 8);
        DELETE FROM asistencia_alumno WHERE id_alumno = v_juan_id AND id_aula_curso BETWEEN 1 AND 8;
    END IF;
END $$;

-- Poblar tareas en todos los bimestres para los 8 cursos
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
    v_juan_id INT;
BEGIN
    SELECT a.id_alumno INTO v_juan_id FROM alumnos a JOIN usuarios u ON u.id_usuario = a.id_usuario WHERE u.codigo = '5B111808';
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
                v_juan_id,
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
                v_juan_id,
                (random_nota IS NOT NULL),
                random_nota
            );
        END LOOP;

        -- Historial de Asistencia para los 8 cursos
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
                    v_juan_id,
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

-- Materiales de reforzamiento
INSERT INTO materiales_curso (id_aula_curso, semana, clase, titulo, tipo, url, fecha_creacion)
VALUES 
    (1, 2, 1, 'Guía de Refuerzo: Números Enteros y Decimales', 'pdf', 'http://localhost:8080/material/refuerzo_mat_u1.pdf', NOW() - INTERVAL '40 days'),
    (1, 6, 2, 'Video Explicativo: Álgebra y Ecuaciones Básicas', 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', NOW() - INTERVAL '30 days'),
    (1, 10, 1, 'Libro de Referencia: Matemática para 5to de Secundaria', 'url', 'https://bibliotecadigital.pe/libros/mat5_sec.pdf', NOW() - INTERVAL '20 days'),
    (4, 2, 2, 'Lectura de Refuerzo: Historia del Perú Contemporáneo', 'word', 'http://localhost:8080/material/refuerzo_hist_u1.docx', NOW() - INTERVAL '35 days'),
    (4, 6, 1, 'Video Tutorial: Revolución Industrial y sus etapas', 'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', NOW() - INTERVAL '25 days')
ON CONFLICT (id_aula_curso, semana, clase, titulo) DO NOTHING;

-- ============================================================
-- SEED DATA: Calificaciones y Asistencia para Sofía Martínez (5B111809) y Diego Martínez (3A110045)
-- ============================================================

-- Poblar tareas y exámenes para Sofía Martínez en 3ro Sec A (aula_cursos 9 a 16)
DO $$
DECLARE
    c_id INT;
    bim INT;
    sem INT;
    num_t INT;
    t_id BIGINT;
    e_id BIGINT;
    random_nota DECIMAL(4,1);
    clase_fecha DATE;
    random_est VARCHAR(20);
    v_sofia_id INT;
BEGIN
    SELECT a.id_alumno INTO v_sofia_id FROM alumnos a JOIN usuarios u ON u.id_usuario = a.id_usuario WHERE u.codigo = '5B111809';
    
    DELETE FROM notas_tarea WHERE id_alumno = v_sofia_id;
    DELETE FROM notas_examen WHERE id_alumno = v_sofia_id;
    DELETE FROM asistencia_alumno WHERE id_alumno = v_sofia_id;

    FOR c_id IN 9..16 LOOP
        FOR bim IN 1..4 LOOP
            sem := (bim - 1) * 4 + 2;
            
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
                CURRENT_DATE - (180 - sem * 10),
                20,
                1,
                NOW() - (180 - sem * 10) * INTERVAL '1 day'
            ) ON CONFLICT (id_aula_curso, semana, clase, titulo) DO NOTHING;

            -- Obtener el id_tarea recién creado o existente
            SELECT id_tarea INTO t_id FROM tareas_curso WHERE id_aula_curso = c_id AND semana = sem AND clase = 1 LIMIT 1;
            
            -- Crear Nota de Tarea para Sofía (alumno 2)
            IF c_id = 9 THEN
                IF bim = 1 THEN random_nota := 10.0;
                ELSIF bim = 2 THEN random_nota := 9.5;
                ELSIF bim = 3 THEN random_nota := 11.5;
                ELSE random_nota := NULL;
                END IF;
            ELSE
                IF bim = 3 THEN random_nota := 15.0;
                ELSIF bim = 4 THEN random_nota := NULL;
                ELSE random_nota := 14.0 + (c_id % 3);
                END IF;
            END IF;

            -- Si es bim = 4 y el curso es Matemática (9), dejaremos que se entregue pero sin calificar
            IF bim = 4 AND c_id = 9 THEN
                INSERT INTO notas_tarea (id_tarea, id_alumno, entregado, nota, fecha_entrega, url_entrega)
                VALUES (t_id, v_sofia_id, TRUE, NULL, CURRENT_DATE - 1, 'http://localhost:8080/entregas/tarea_sofia.pdf')
                ON CONFLICT (id_tarea, id_alumno) DO NOTHING;
            ELSIF random_nota IS NOT NULL OR bim = 4 THEN
                INSERT INTO notas_tarea (id_tarea, id_alumno, entregado, nota, fecha_entrega, url_entrega)
                VALUES (t_id, v_sofia_id, random_nota IS NOT NULL, random_nota, CASE WHEN random_nota IS NOT NULL THEN CURRENT_DATE - (180 - sem * 10) ELSE NULL END, NULL)
                ON CONFLICT (id_tarea, id_alumno) DO NOTHING;
            END IF;

            -- Crear Examen
            INSERT INTO examenes_curso (id_aula_curso, numero_examen, semana, clase, titulo, descripcion, tipo, fecha_examen, duracion_minutos, nota_maxima, fecha_creacion)
            VALUES (
                c_id,
                bim,
                sem + 2,
                2,
                'Examen Bimestre ' || bim || ' - Curso ' || c_id,
                'Evaluación de conocimientos del bimestre ' || bim,
                'escrito',
                CURRENT_DATE - (180 - (sem + 2) * 10),
                90,
                20,
                NOW() - (180 - (sem + 2) * 10) * INTERVAL '1 day'
            ) ON CONFLICT (id_aula_curso, semana, clase, titulo) DO NOTHING;

            SELECT id_examen INTO e_id FROM examenes_curso WHERE id_aula_curso = c_id AND semana = sem + 2 AND clase = 2 LIMIT 1;

            -- Crear Nota de Examen para Sofía
            IF c_id = 9 THEN
                IF bim = 1 THEN random_nota := 9.0;
                ELSIF bim = 2 THEN random_nota := 10.0;
                ELSIF bim = 3 THEN random_nota := 8.5;
                ELSE random_nota := NULL;
                END IF;
            ELSE
                IF bim = 3 THEN random_nota := 16.0;
                ELSIF bim = 4 THEN random_nota := NULL;
                ELSE random_nota := 13.0 + (c_id % 4);
                END IF;
            END IF;

            -- Si es bim = 4 y c_id = 9 (Matemática), dejaremos asistió pero sin calificar
            IF bim = 4 AND c_id = 9 THEN
                INSERT INTO notas_examen (id_examen, id_alumno, asistio, nota)
                VALUES (e_id, v_sofia_id, TRUE, NULL)
                ON CONFLICT (id_examen, id_alumno) DO NOTHING;
            ELSIF random_nota IS NOT NULL OR bim = 4 THEN
                INSERT INTO notas_examen (id_examen, id_alumno, asistio, nota)
                VALUES (e_id, v_sofia_id, TRUE, random_nota)
                ON CONFLICT (id_examen, id_alumno) DO NOTHING;
            END IF;
        END LOOP;

        -- Registrar asistencias pasadas de semanas 1 a 12 para Sofía
        FOR sem IN 1..12 LOOP
            FOR num_t IN 1..2 LOOP
                clase_fecha := CURRENT_DATE - (180 - (sem * 10 + num_t));
                IF c_id = 9 AND sem IN (2, 4, 6, 8, 10) AND num_t = 1 THEN
                    random_est := 'falta';
                ELSIF (sem + c_id + num_t) % 25 = 0 THEN
                    random_est := 'tardanza';
                ELSE
                    random_est := 'presente';
                END IF;

                INSERT INTO asistencia_alumno (id_alumno, id_aula_curso, fecha, estado, justificante)
                VALUES (v_sofia_id, c_id, clase_fecha, random_est, NULL)
                ON CONFLICT (id_alumno, id_aula_curso, fecha) DO UPDATE SET estado = EXCLUDED.estado;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;


-- Poblar tareas y exámenes para Diego Martínez (id_alumno = 3) en 1ro Prim A (aula_cursos 17 a 22)
DO $$
DECLARE
    c_id INT;
    bim INT;
    sem INT;
    num_t INT;
    t_id BIGINT;
    e_id BIGINT;
    random_nota DECIMAL(4,1);
    clase_fecha DATE;
    random_est VARCHAR(20);
    v_diego_id INT;
BEGIN
    SELECT a.id_alumno INTO v_diego_id FROM alumnos a JOIN usuarios u ON u.id_usuario = a.id_usuario WHERE u.codigo = '3A110045';
    
    DELETE FROM notas_tarea WHERE id_alumno = v_diego_id;
    DELETE FROM notas_examen WHERE id_alumno = v_diego_id;
    DELETE FROM asistencia_alumno WHERE id_alumno = v_diego_id;

    FOR c_id IN 17..22 LOOP
        FOR bim IN 1..4 LOOP
            sem := (bim - 1) * 4 + 2;
            
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
                CURRENT_DATE - (180 - sem * 10),
                20,
                1,
                NOW() - (180 - sem * 10) * INTERVAL '1 day'
            ) ON CONFLICT (id_aula_curso, semana, clase, titulo) DO NOTHING;

            SELECT id_tarea INTO t_id FROM tareas_curso WHERE id_aula_curso = c_id AND semana = sem AND clase = 1 LIMIT 1;
            
            -- Crear Nota de Tarea para Diego (alumno 3)
            IF bim = 3 THEN random_nota := 14.5;
            ELSIF bim = 4 THEN random_nota := NULL;
            ELSE random_nota := 15.0 + (c_id % 3);
            END IF;

            -- Si es bim = 4 y el curso es Matematica (17), dejar entregado sin calificar
            IF bim = 4 AND c_id = 17 THEN
                INSERT INTO notas_tarea (id_tarea, id_alumno, entregado, nota, fecha_entrega, url_entrega)
                VALUES (t_id, v_diego_id, TRUE, NULL, CURRENT_DATE - 1, 'http://localhost:8080/entregas/tarea_diego.pdf')
                ON CONFLICT (id_tarea, id_alumno) DO NOTHING;
            ELSIF random_nota IS NOT NULL OR bim = 4 THEN
                INSERT INTO notas_tarea (id_tarea, id_alumno, entregado, nota, fecha_entrega, url_entrega)
                VALUES (t_id, v_diego_id, random_nota IS NOT NULL, random_nota, CASE WHEN random_nota IS NOT NULL THEN CURRENT_DATE - (180 - sem * 10) ELSE NULL END, NULL)
                ON CONFLICT (id_tarea, id_alumno) DO NOTHING;
            END IF;

            -- Crear Examen
            INSERT INTO examenes_curso (id_aula_curso, numero_examen, semana, clase, titulo, descripcion, tipo, fecha_examen, duracion_minutos, nota_maxima, fecha_creacion)
            VALUES (
                c_id,
                bim,
                sem + 2,
                2,
                'Examen Bimestre ' || bim || ' - Curso ' || c_id,
                'Evaluación de conocimientos del bimestre ' || bim,
                'escrito',
                CURRENT_DATE - (180 - (sem + 2) * 10),
                90,
                20,
                NOW() - (180 - (sem + 2) * 10) * INTERVAL '1 day'
            ) ON CONFLICT (id_aula_curso, semana, clase, titulo) DO NOTHING;

            SELECT id_examen INTO e_id FROM examenes_curso WHERE id_aula_curso = c_id AND semana = sem + 2 AND clase = 2 LIMIT 1;

            -- Crear Nota de Examen para Diego
            IF bim = 3 THEN random_nota := 15.0;
            ELSIF bim = 4 THEN random_nota := NULL;
            ELSE random_nota := 16.0;
            END IF;

            IF bim = 4 AND c_id = 17 THEN
                INSERT INTO notas_examen (id_examen, id_alumno, asistio, nota)
                VALUES (e_id, v_diego_id, TRUE, NULL)
                ON CONFLICT (id_examen, id_alumno) DO NOTHING;
            ELSIF random_nota IS NOT NULL OR bim = 4 THEN
                INSERT INTO notas_examen (id_examen, id_alumno, asistio, nota)
                VALUES (e_id, v_diego_id, TRUE, random_nota)
                ON CONFLICT (id_examen, id_alumno) DO NOTHING;
            END IF;
        END LOOP;

        -- Registrar asistencias pasadas de semanas 1 a 12 para Diego
        FOR sem IN 1..12 LOOP
            FOR num_t IN 1..2 LOOP
                clase_fecha := CURRENT_DATE - (180 - (sem * 10 + num_t));
                IF c_id = 17 AND sem IN (1, 3, 5, 7, 9, 11) AND num_t = 1 THEN
                    random_est := 'falta';
                ELSIF (sem + c_id + num_t) % 25 = 0 THEN
                    random_est := 'tardanza';
                ELSE
                    random_est := 'presente';
                END IF;

                INSERT INTO asistencia_alumno (id_alumno, id_aula_curso, fecha, estado, justificante)
                VALUES (v_diego_id, c_id, clase_fecha, random_est, NULL)
                ON CONFLICT (id_alumno, id_aula_curso, fecha) DO UPDATE SET estado = EXCLUDED.estado;
            END LOOP;
        END LOOP;
    END LOOP;
END $$;




-- ==========================================
-- FILE: 10_migrate_config.sql
-- ==========================================

-- =============================================================
-- MIGRACIÓN: Configuración de Colegio, Año Escolar y Roles
-- Portal Académico San Agustín Campus
-- =============================================================

-- Datos institucionales del colegio
CREATE TABLE IF NOT EXISTS colegio_config (
    id_config     SERIAL PRIMARY KEY,
    nombre        VARCHAR(200) NOT NULL,
    ruc           VARCHAR(20),
    direccion     VARCHAR(300),
    telefono      VARCHAR(30),
    email         VARCHAR(150),
    logo_url      VARCHAR(500),
    ciudad        VARCHAR(100),
    distrito      VARCHAR(100),
    nivel         VARCHAR(100) DEFAULT 'Inicial, Primaria y Secundaria',
    director      VARCHAR(150),
    mision        TEXT,
    vision        TEXT,
    actualizado_en TIMESTAMP DEFAULT now()
);

-- Años escolares
CREATE TABLE IF NOT EXISTS anos_escolares (
    id_ano        SERIAL PRIMARY KEY,
    nombre        VARCHAR(50)  NOT NULL,
    fecha_inicio  DATE         NOT NULL,
    fecha_fin     DATE         NOT NULL,
    activo        BOOLEAN NOT NULL DEFAULT false,
    creado_en     TIMESTAMP DEFAULT now()
);

-- Módulos del sistema (para la matriz de permisos)
CREATE TABLE IF NOT EXISTS modulos_sistema (
    id_modulo  SERIAL PRIMARY KEY,
    nombre     VARCHAR(100) NOT NULL,
    descripcion VARCHAR(200),
    icono      VARCHAR(50)
);

-- Roles del sistema
CREATE TABLE IF NOT EXISTS roles_sistema (
    id_rol     SERIAL PRIMARY KEY,
    nombre     VARCHAR(50)  NOT NULL UNIQUE,
    descripcion VARCHAR(200)
);

-- Matriz de permisos: rol ↔ módulo
CREATE TABLE IF NOT EXISTS permisos_rol_modulo (
    id_permiso SERIAL PRIMARY KEY,
    id_rol     INTEGER REFERENCES roles_sistema(id_rol)   ON DELETE CASCADE,
    id_modulo  INTEGER REFERENCES modulos_sistema(id_modulo) ON DELETE CASCADE,
    puede_ver    BOOLEAN NOT NULL DEFAULT false,
    puede_crear  BOOLEAN NOT NULL DEFAULT false,
    puede_editar BOOLEAN NOT NULL DEFAULT false,
    puede_borrar BOOLEAN NOT NULL DEFAULT false,
    UNIQUE (id_rol, id_modulo)
);

-- ── SEMILLA ──────────────────────────────────────────────────

INSERT INTO colegio_config (nombre, ruc, direccion, telefono, email, ciudad, distrito, nivel, director, mision, vision)
VALUES (
    'Institución Educativa San Agustín Campus',
    '20512345678',
    'Av. San Agustín 1250, Lima',
    '(01) 555-1234',
    'contacto@sanagustincampus.edu.pe',
    'Lima',
    'San Isidro',
    'Inicial, Primaria y Secundaria',
    'Mg. Carlos Rodríguez Vega',
    'Brindar una educación integral, innovadora y de calidad, formando personas con valores sólidos, pensamiento crítico y habilidades para el siglo XXI.',
    'Ser reconocidos como la institución educativa líder en Lima, referente de excelencia académica, convivencia inclusiva y formación en valores.'
) ON CONFLICT DO NOTHING;

INSERT INTO anos_escolares (nombre, fecha_inicio, fecha_fin, activo) VALUES
  ('Año Escolar 2024', '2024-03-11', '2024-12-20', false),
  ('Año Escolar 2025', '2025-03-10', '2025-12-19', false),
  ('Año Escolar 2026', '2026-03-09', '2026-12-18', true)
ON CONFLICT DO NOTHING;

INSERT INTO modulos_sistema (nombre, descripcion, icono) VALUES
  ('Dashboard',        'Panel principal con KPIs',                  'grid'),
  ('Estudiantes',      'Gestión de matrícula y datos del alumno',   'users'),
  ('Docentes',         'Gestión del personal docente',              'book-open'),
  ('Apoderados',       'Gestión de padres/tutores',                 'user-check'),
  ('Finanzas',         'Conceptos de pago y cobranza',             'dollar-sign'),
  ('Caja y Análisis',  'Movimientos e ingresos operativos',        'activity'),
  ('Portal Docente',   'Calificaciones, tareas y asistencias',     'edit'),
  ('Portal Alumno',    'Notas, temario y asistencias del alumno',  'award'),
  ('Portal Padre',     'Seguimiento del hijo y mensajería',        'home'),
  ('Kanban Notas',     'Tablero de tareas internas del admin',     'columns'),
  ('Configuración',    'Datos institucionales y años escolares',   'settings')
ON CONFLICT DO NOTHING;

INSERT INTO roles_sistema (nombre, descripcion) VALUES
  ('ADMIN',    'Acceso total al sistema'),
  ('DOCENTE',  'Gestión académica: calificaciones, tareas y asistencias'),
  ('ALUMNO',   'Acceso al portal del estudiante'),
  ('PADRE',    'Acceso al portal del apoderado')
ON CONFLICT DO NOTHING;

-- Permisos para ADMIN: acceso total a todos los módulos
INSERT INTO permisos_rol_modulo (id_rol, id_modulo, puede_ver, puede_crear, puede_editar, puede_borrar)
SELECT r.id_rol, m.id_modulo, true, true, true, true
FROM roles_sistema r, modulos_sistema m
WHERE r.nombre = 'ADMIN'
ON CONFLICT DO NOTHING;

-- Permisos para DOCENTE
INSERT INTO permisos_rol_modulo (id_rol, id_modulo, puede_ver, puede_crear, puede_editar, puede_borrar)
SELECT r.id_rol, m.id_modulo,
       true,
       m.nombre IN ('Portal Docente'),
       m.nombre IN ('Portal Docente'),
       false
FROM roles_sistema r, modulos_sistema m
WHERE r.nombre = 'DOCENTE'
  AND m.nombre IN ('Portal Docente', 'Dashboard')
ON CONFLICT DO NOTHING;

-- Permisos para ALUMNO
INSERT INTO permisos_rol_modulo (id_rol, id_modulo, puede_ver, puede_crear, puede_editar, puede_borrar)
SELECT r.id_rol, m.id_modulo, true, false, false, false
FROM roles_sistema r, modulos_sistema m
WHERE r.nombre = 'ALUMNO'
  AND m.nombre IN ('Portal Alumno', 'Dashboard')
ON CONFLICT DO NOTHING;

-- Permisos para PADRE
INSERT INTO permisos_rol_modulo (id_rol, id_modulo, puede_ver, puede_crear, puede_editar, puede_borrar)
SELECT r.id_rol, m.id_modulo, true, false, false, false
FROM roles_sistema r, modulos_sistema m
WHERE r.nombre = 'PADRE'
  AND m.nombre IN ('Portal Padre', 'Dashboard')
ON CONFLICT DO NOTHING;


-- ==========================================
-- FILE: 11_migrate_personal.sql
-- ==========================================

-- =============================================================
-- MIGRACIÓN: Personal y Pagos RRHH
-- Portal Académico San Agustín Campus
-- =============================================================

CREATE TABLE IF NOT EXISTS personal (
    id_personal   SERIAL PRIMARY KEY,
    nombre        VARCHAR(150) NOT NULL,
    cargo         VARCHAR(100) NOT NULL, -- 'administrativo', 'limpieza', 'seguridad', 'auxiliar', etc.
    tipo_contrato VARCHAR(50) NOT NULL,  -- 'pleno', 'parcial', 'honorarios'
    salario_base  DECIMAL(10,2) NOT NULL,
    activo        BOOLEAN NOT NULL DEFAULT true,
    creado_en     TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pagos_personal (
    id_pago       SERIAL PRIMARY KEY,
    id_personal   INT NOT NULL REFERENCES personal(id_personal) ON DELETE CASCADE,
    mes           VARCHAR(20) NOT NULL, -- '2026-03', '2026-04', etc.
    monto_neto    DECIMAL(10,2) NOT NULL,
    fecha_pago    DATE NOT NULL,
    nro_recibo    VARCHAR(50),
    creado_en     TIMESTAMP DEFAULT now(),
    UNIQUE (id_personal, mes)
);

-- Semillas
INSERT INTO personal (nombre, cargo, tipo_contrato, salario_base, activo) VALUES
  ('Juan Carlos Gómez', 'Auxiliar de Limpieza', 'pleno', 1200.00, true),
  ('Margarita Flores', 'Secretaria Académica', 'pleno', 1800.00, true),
  ('Pedro Quispe', 'Personal de Seguridad', 'pleno', 1500.00, true),
  ('Luisa Benites', 'Coordinadora de Inicial', 'pleno', 2500.00, true),
  ('Sandro Rosas', 'Soporte Técnico TI', 'parcial', 950.00, true)
ON CONFLICT DO NOTHING;

INSERT INTO pagos_personal (id_personal, mes, monto_neto, fecha_pago, nro_recibo) VALUES
  (1, '2026-03', 1200.00, '2026-03-31', 'REC-0010'),
  (2, '2026-03', 1800.00, '2026-03-31', 'REC-0011'),
  (3, '2026-03', 1500.00, '2026-03-31', 'REC-0012')
ON CONFLICT DO NOTHING;


-- ==========================================
-- FILE: 12_migrate_admin_notas.sql
-- ==========================================

-- ============================================================
-- MIGRACIÓN: notas_kanban (Admin Kanban Notes)
-- ============================================================

CREATE TABLE IF NOT EXISTS notas_kanban (
    id_nota         SERIAL       PRIMARY KEY,
    titulo          VARCHAR(200) NOT NULL,
    descripcion     TEXT,
    prioridad       VARCHAR(20)  NOT NULL DEFAULT 'media', -- alta | media | baja
    estado          VARCHAR(20)  NOT NULL DEFAULT 'pendiente', -- pendiente | en_progreso | completada
    responsable     VARCHAR(100),
    fecha_limite    DATE,
    etiquetas       VARCHAR(200),
    fecha_creacion  TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Seed initial data only if empty
INSERT INTO notas_kanban (titulo, descripcion, prioridad, estado, responsable, fecha_limite, etiquetas)
SELECT 'Revisar contratos docentes', 'Actualizar los contratos por honorarios del personal de secundaria.', 'alta', 'pendiente', 'Recursos Humanos', CURRENT_DATE + 5, 'Personal,Contratos'
WHERE NOT EXISTS (SELECT 1 FROM notas_kanban);

INSERT INTO notas_kanban (titulo, descripcion, prioridad, estado, responsable, fecha_limite, etiquetas)
SELECT 'Conciliar caja chica', 'Cerrar el balance de ingresos menores correspondientes al mes de Junio.', 'media', 'en_progreso', 'Tesorería', CURRENT_DATE + 2, 'Finanzas,Caja'
WHERE NOT EXISTS (SELECT 1 FROM notas_kanban WHERE titulo = 'Conciliar caja chica');

INSERT INTO notas_kanban (titulo, descripcion, prioridad, estado, responsable, fecha_limite, etiquetas)
SELECT 'Preparar listado morosos', 'Generar reporte consolidado de pensiones atrasadas para coordinación.', 'alta', 'completada', 'Tesorería', CURRENT_DATE - 1, 'Reportes,Finanzas'
WHERE NOT EXISTS (SELECT 1 FROM notas_kanban WHERE titulo = 'Preparar listado morosos');


-- ==========================================
-- FILE: 13_migrate_asistencia.sql
-- ==========================================

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


-- ==========================================
-- FILE: 14_migrate_caja.sql
-- ==========================================

-- =============================================================
-- MIGRACIÓN: Módulo Caja y Análisis
-- Portal Académico San Agustín Campus
-- =============================================================

-- Categorías de gastos / ingresos
CREATE TABLE IF NOT EXISTS categorias_caja (
    id_categoria  SERIAL PRIMARY KEY,
    nombre        VARCHAR(100) NOT NULL,
    tipo          VARCHAR(10)  NOT NULL CHECK (tipo IN ('ingreso','gasto')),
    descripcion   VARCHAR(255),
    activo        BOOLEAN NOT NULL DEFAULT true,
    creado_en     TIMESTAMP DEFAULT now()
);

-- Movimientos de caja (ingresos y gastos operativos)
CREATE TABLE IF NOT EXISTS movimientos_caja (
    id_movimiento SERIAL PRIMARY KEY,
    tipo          VARCHAR(10)  NOT NULL CHECK (tipo IN ('ingreso','gasto')),
    id_categoria  INTEGER REFERENCES categorias_caja(id_categoria),
    descripcion   VARCHAR(255) NOT NULL,
    monto         NUMERIC(12,2) NOT NULL,
    fecha         DATE         NOT NULL DEFAULT CURRENT_DATE,
    referencia    VARCHAR(100),
    registrado_en TIMESTAMP DEFAULT now()
);

-- Presupuestos mensuales por categoría
CREATE TABLE IF NOT EXISTS presupuestos_caja (
    id_presupuesto SERIAL PRIMARY KEY,
    id_categoria   INTEGER REFERENCES categorias_caja(id_categoria),
    anio           INTEGER NOT NULL,
    mes            INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
    monto_objetivo NUMERIC(12,2) NOT NULL,
    UNIQUE (id_categoria, anio, mes)
);

-- ── SEMILLA ──────────────────────────────────────────────────

INSERT INTO categorias_caja (nombre, tipo, descripcion) VALUES
  ('Pensiones',          'ingreso', 'Cobro mensual de pensiones escolares'),
  ('Matrículas',         'ingreso', 'Cobro de matrículas por año escolar'),
  ('Otros Ingresos',     'ingreso', 'Donaciones y actividades escolares'),
  ('Planilla Docentes',  'gasto',   'Sueldos y beneficios del personal docente'),
  ('Mantenimiento',      'gasto',   'Mantenimiento de infraestructura y equipos'),
  ('Servicios Básicos',  'gasto',   'Agua, luz, internet y telefonía'),
  ('Material Educativo', 'gasto',   'Libros, útiles y material pedagógico'),
  ('Limpieza',           'gasto',   'Personal y suministros de limpieza')
ON CONFLICT DO NOTHING;

-- Movimientos del primer semestre 2026
INSERT INTO movimientos_caja (tipo, id_categoria, descripcion, monto, fecha) VALUES
  ('ingreso', 1, 'Pensiones Enero 2026',        4500.00, '2026-01-05'),
  ('ingreso', 1, 'Pensiones Febrero 2026',       4650.00, '2026-02-05'),
  ('ingreso', 1, 'Pensiones Marzo 2026',         4700.00, '2026-03-05'),
  ('ingreso', 1, 'Pensiones Abril 2026',         4750.00, '2026-04-05'),
  ('ingreso', 1, 'Pensiones Mayo 2026',          4800.00, '2026-05-05'),
  ('ingreso', 1, 'Pensiones Junio 2026',         4850.00, '2026-06-05'),
  ('ingreso', 2, 'Matrícula 2026',              12000.00, '2026-01-10'),
  ('gasto',   4, 'Planilla Enero 2026',          3200.00, '2026-01-28'),
  ('gasto',   4, 'Planilla Febrero 2026',        3200.00, '2026-02-28'),
  ('gasto',   4, 'Planilla Marzo 2026',          3250.00, '2026-03-28'),
  ('gasto',   4, 'Planilla Abril 2026',          3250.00, '2026-04-28'),
  ('gasto',   4, 'Planilla Mayo 2026',           3300.00, '2026-05-28'),
  ('gasto',   4, 'Planilla Junio 2026',          3300.00, '2026-06-28'),
  ('gasto',   5, 'Reparación Laboratorio',        850.00, '2026-03-15'),
  ('gasto',   6, 'Servicios Básicos Q1',          450.00, '2026-03-31'),
  ('gasto',   6, 'Servicios Básicos Q2',          470.00, '2026-06-30'),
  ('gasto',   7, 'Libros y material 2026',       1200.00, '2026-01-20'),
  ('gasto',   8, 'Limpieza Enero-Junio',          600.00, '2026-06-30')
ON CONFLICT DO NOTHING;

-- Presupuestos mensuales 2026 para categorías de gasto principales
INSERT INTO presupuestos_caja (id_categoria, anio, mes, monto_objetivo) VALUES
  (4, 2026, 1, 3200), (4, 2026, 2, 3200), (4, 2026, 3, 3250),
  (4, 2026, 4, 3250), (4, 2026, 5, 3300), (4, 2026, 6, 3300),
  (5, 2026, 1,  500), (5, 2026, 2,  500), (5, 2026, 3,  900),
  (5, 2026, 4,  500), (5, 2026, 5,  500), (5, 2026, 6,  500),
  (6, 2026, 1,  150), (6, 2026, 2,  150), (6, 2026, 3,  150),
  (6, 2026, 4,  150), (6, 2026, 5,  150), (6, 2026, 6,  150)
ON CONFLICT DO NOTHING;


-- ==========================================
-- FILE: 15_migrate_eventos.sql
-- ==========================================

-- =============================================================
-- MIGRACIÓN: Eventos Institucionales
-- Portal Académico San Agustín Campus
-- =============================================================

CREATE TABLE IF NOT EXISTS eventos_institucionales (
    id_evento     SERIAL PRIMARY KEY,
    tipo          VARCHAR(50) NOT NULL, -- 'reunion', 'academico', 'feriado', 'administrativo', 'otro'
    titulo        VARCHAR(200) NOT NULL,
    fecha         DATE NOT NULL,
    hora_inicio   TIME NOT NULL,
    hora_fin      TIME NOT NULL,
    lugar         VARCHAR(200),
    descripcion   TEXT,
    creado_por    VARCHAR(100),
    creado_en     TIMESTAMP DEFAULT now(),
    CONSTRAINT ck_evento_horas CHECK (hora_fin > hora_inicio)
);

-- Semillas
INSERT INTO eventos_institucionales (tipo, titulo, fecha, hora_inicio, hora_fin, lugar, descripcion, creado_por) VALUES
  ('academico', 'Inicio de Clases - I Bimestre', '2026-03-09', '07:30:00', '14:00:00', 'Aulas de Clase', 'Inicio formal del año lectivo 2026', 'ADMIN'),
  ('reunion', 'Primera Reunión General de Padres de Familia', '2026-03-13', '18:00:00', '20:00:00', 'Auditorio Principal', 'Coordinación de lineamientos del año escolar', 'ADMIN'),
  ('feriado', 'Feriado Semana Santa (Jueves Santo)', '2026-04-02', '00:00:00', '23:59:59', 'Todo el Colegio', 'Feriado nacional no laborable', 'ADMIN'),
  ('feriado', 'Feriado Semana Santa (Viernes Santo)', '2026-04-03', '00:00:00', '23:59:59', 'Todo el Colegio', 'Feriado nacional no laborable', 'ADMIN'),
  ('administrativo', 'Junta de Profesores - Evaluación I Bimestre', '2026-05-15', '14:30:00', '17:30:00', 'Sala de Profesores', 'Análisis de rendimiento académico', 'ADMIN'),
  ('otro', 'Día del Maestro - Celebración Institucional', '2026-07-06', '08:00:00', '13:00:00', 'Patio Central', 'Homenaje a los docentes del colegio', 'ADMIN')
ON CONFLICT DO NOTHING;


-- ==========================================
-- FILE: 16_migrate_examenes.sql
-- ==========================================

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


-- ==========================================
-- FILE: 17_migrate_finanzas.sql
-- ==========================================

-- ============================================================
-- MIGRACIÓN: conceptos_pago + cuotas_estudiante + seed
-- ============================================================

CREATE TABLE IF NOT EXISTS conceptos_pago (
    id_concepto   SERIAL         PRIMARY KEY,
    nombre        VARCHAR(150)   NOT NULL,
    descripcion   TEXT,
    monto         DECIMAL(10,2)  NOT NULL,
    activo        BOOLEAN        NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cuotas_estudiante (
    id_cuota      SERIAL         PRIMARY KEY,
    id_estudiante INT            NOT NULL REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
    id_concepto   INT            NOT NULL REFERENCES conceptos_pago(id_concepto) ON DELETE CASCADE,
    fecha_vencimiento DATE       NOT NULL,
    pagado        BOOLEAN        NOT NULL DEFAULT FALSE,
    fecha_pago    TIMESTAMP,
    nro_transaccion VARCHAR(100),
    UNIQUE (id_estudiante, id_concepto)
);

-- Seed data si está vacío
DO $$
DECLARE
    id_matr1 INT;
    id_pen_mar INT;
    id_pen_abr INT;
    id_pen_may INT;
    id_robot INT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM conceptos_pago LIMIT 1) THEN
        -- Conceptos de Pago
        INSERT INTO conceptos_pago (nombre, descripcion, monto, activo)
        VALUES 
            ('Matrícula 2026', 'Costo de inscripción anual periodo 2026', 350.00, TRUE),
            ('Pensión Marzo 2026', 'Primera pensión mensual de enseñanza', 450.00, TRUE),
            ('Pensión Abril 2026', 'Segunda pensión mensual de enseñanza', 450.00, TRUE),
            ('Pensión Mayo 2026', 'Tercera pensión mensual de enseñanza', 450.00, TRUE),
            ('Taller de Robótica', 'Inscripción a taller extracurrilar de Robótica interactiva', 120.00, TRUE);

        -- Recuperar IDs creados
        SELECT id_concepto INTO id_matr1 FROM conceptos_pago WHERE nombre = 'Matrícula 2026';
        SELECT id_concepto INTO id_pen_mar FROM conceptos_pago WHERE nombre = 'Pensión Marzo 2026';
        SELECT id_concepto INTO id_pen_abr FROM conceptos_pago WHERE nombre = 'Pensión Abril 2026';
        SELECT id_concepto INTO id_pen_may FROM conceptos_pago WHERE nombre = 'Pensión Mayo 2026';
        SELECT id_concepto INTO id_robot FROM conceptos_pago WHERE nombre = 'Taller de Robótica';

        -- Asignar Cuotas a los alumnos
        -- Juan Martínez (id_alumno = 1)
        INSERT INTO cuotas_estudiante (id_estudiante, id_concepto, fecha_vencimiento, pagado, fecha_pago, nro_transaccion)
        VALUES
            (1, id_matr1,   '2026-03-01', TRUE,  NOW() - INTERVAL '115 days', 'TX-78491A'),
            (1, id_pen_mar, '2026-03-31', TRUE,  NOW() - INTERVAL '90 days',  'TX-88210B'),
            (1, id_pen_abr, '2026-04-30', TRUE,  NOW() - INTERVAL '60 days',  'TX-90124C'),
            (1, id_pen_may, '2026-05-31', FALSE, NULL,                        NULL),
            (1, id_robot,   '2026-04-15', TRUE,  NOW() - INTERVAL '70 days',  'TX-92019R');

        -- Sofía Martínez (id_alumno = 2)
        INSERT INTO cuotas_estudiante (id_estudiante, id_concepto, fecha_vencimiento, pagado, fecha_pago, nro_transaccion)
        VALUES
            (2, id_matr1,   '2026-03-01', TRUE,  NOW() - INTERVAL '114 days', 'TX-78492A'),
            (2, id_pen_mar, '2026-03-31', TRUE,  NOW() - INTERVAL '89 days',  'TX-88211B'),
            (2, id_pen_abr, '2026-04-30', FALSE, NULL,                        NULL),
            (2, id_pen_may, '2026-05-31', FALSE, NULL,                        NULL);

        -- Diego Martínez (id_alumno = 3)
        INSERT INTO cuotas_estudiante (id_estudiante, id_concepto, fecha_vencimiento, pagado, fecha_pago, nro_transaccion)
        VALUES
            (3, id_matr1,   '2026-03-01', TRUE,  NOW() - INTERVAL '113 days', 'TX-78493A'),
            (3, id_pen_mar, '2026-03-31', FALSE, NULL,                        NULL),
            (3, id_pen_abr, '2026-04-30', FALSE, NULL,                        NULL),
            (3, id_pen_may, '2026-05-31', FALSE, NULL,                        NULL);
    END IF;
END $$;


-- ==========================================
-- FILE: 18_migrate_gamificacion.sql
-- ==========================================

-- CREATE TABLE para misiones y insignias
CREATE TABLE IF NOT EXISTS alumnos_misiones (
    id_mision   SERIAL       PRIMARY KEY,
    id_alumno   INT          NOT NULL REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
    titulo      VARCHAR(100) NOT NULL,
    descripcion VARCHAR(255) NOT NULL,
    icono       VARCHAR(10)  NOT NULL,
    progreso    INT          NOT NULL DEFAULT 0,
    completado  BOOLEAN      NOT NULL DEFAULT FALSE,
    categoria   VARCHAR(50)  NOT NULL
);

CREATE TABLE IF NOT EXISTS alumnos_insignias (
    id_insignia     SERIAL       PRIMARY KEY,
    id_alumno       INT          NOT NULL REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
    nombre          VARCHAR(100) NOT NULL,
    descripcion     VARCHAR(255) NOT NULL,
    icono           VARCHAR(10)  NOT NULL,
    fecha_desbloqueo TIMESTAMP    NOT NULL DEFAULT NOW()
);


-- ==========================================
-- FILE: 19_migrate_materiales.sql
-- ==========================================

-- ============================================================
-- MIGRACIÓN: Agregar tabla materiales_curso + seed data
-- Ejecutar contra la DB ya existente (no rompe nada si se repite
-- gracias a IF NOT EXISTS).
-- ============================================================

CREATE TABLE IF NOT EXISTS materiales_curso (
    id_material    SERIAL       PRIMARY KEY,
    id_aula_curso  INT          NOT NULL REFERENCES aula_cursos(id_aula_curso) ON DELETE CASCADE,
    semana         SMALLINT     NOT NULL DEFAULT 1,
    clase          SMALLINT     NOT NULL DEFAULT 1,
    titulo         VARCHAR(200) NOT NULL,
    tipo           VARCHAR(20)  NOT NULL DEFAULT 'pdf',
    url            TEXT,
    contenido_texto TEXT,
    fecha_creacion TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- Seed data solo si la tabla está vacía
INSERT INTO materiales_curso (id_aula_curso, semana, clase, titulo, tipo, url, fecha_creacion)
SELECT * FROM (VALUES
    (1::int, 1::smallint, 1::smallint, 'Números enteros: concepto y clasificación',  'pdf',     'http://localhost:8080/material/numeros_enteros.pdf'::text, NOW() - INTERVAL '20 days'),
    (1,      1,           1,           'Ejercicios de práctica N°1',                 'pdf',     'http://localhost:8080/material/ejercicios_enteros.pdf',       NOW() - INTERVAL '19 days'),
    (1,      1,           2,           'Video: Operaciones con enteros',             'youtube', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', NOW() - INTERVAL '18 days'),
    (1,      1,           2,           'Recurso interactivo - GeoGebra',             'url',     'https://www.geogebra.org', NOW() - INTERVAL '17 days'),
    (1,      2,           1,           'Decimales: concepto, tipos y escritura',     'pdf',     'http://localhost:8080/material/decimales_teoria.pdf',       NOW() - INTERVAL '13 days'),
    (1,      2,           1,           'Guía de trabajo: decimales',                 'word',    'http://localhost:8080/material/guia_decimales.docx',       NOW() - INTERVAL '12 days'),
    (1,      2,           2,           'Operaciones con decimales – suma y resta',   'pdf',     'http://localhost:8080/material/operaciones_decimales.pdf',       NOW() - INTERVAL '11 days'),
    (1,      3,           1,           'Fracciones: concepto y tipos',               'pdf',     'http://localhost:8080/material/fracciones_concepto.pdf',       NOW() - INTERVAL '6 days'),
    (1,      3,           1,           'Video: Fracciones equivalentes',             'youtube', 'https://www.youtube.com/watch?v=example1', NOW() - INTERVAL '5 days'),
    (9,      1,           1,           'Introducción al álgebra',                    'pdf',     'http://localhost:8080/material/introduccion_algebra.pdf',       NOW() - INTERVAL '20 days'),
    (9,      1,           1,           'Ejercicios de expresiones algebraicas',      'pdf',     'http://localhost:8080/material/ejercicios_algebra.pdf',       NOW() - INTERVAL '19 days'),
    (9,      1,           2,           'Ecuaciones de primer grado',                 'pdf',     'http://localhost:8080/material/ecuaciones_primer_grado.pdf',       NOW() - INTERVAL '17 days'),
    (9,      1,           2,           'Tutorial interactivo - ecuaciones',          'url',     'https://www.khanacademy.org', NOW() - INTERVAL '16 days'),
    (9,      2,           1,           'Sistemas de ecuaciones',                     'pdf',     'http://localhost:8080/material/sistemas_ecuaciones.pdf',       NOW() - INTERVAL '10 days'),
    (17,     1,           1,           'Números del 1 al 10',                        'pdf',     'http://localhost:8080/material/numeros_1_10.pdf',       NOW() - INTERVAL '20 days'),
    (17,     1,           1,           'Video: Contando con deditos',                'youtube', 'https://www.youtube.com/watch?v=example2', NOW() - INTERVAL '19 days'),
    (17,     1,           2,           'Suma y resta básica',                        'pdf',     'http://localhost:8080/material/suma_resta_basica.pdf',       NOW() - INTERVAL '17 days')
) AS v(id_aula_curso, semana, clase, titulo, tipo, url, fecha_creacion)
WHERE NOT EXISTS (SELECT 1 FROM materiales_curso LIMIT 1);


-- ==========================================
-- FILE: 20_migrate_mensajes_leido_padre.sql
-- ==========================================

-- ============================================================
-- Migración: Añadir columna leido_padre a tabla mensajes
-- ============================================================

ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS leido_padre BOOLEAN NOT NULL DEFAULT FALSE;

-- Marcar mensajes existentes como leídos si no son nuevos
UPDATE mensajes SET leido_padre = TRUE WHERE leido = TRUE;


-- ==========================================
-- FILE: 21_migrate_portal_docente_fix.sql
-- ==========================================

-- ============================================================
-- MIGRACIÓN: Tablas y columnas faltantes para el Portal Docente
-- Aplicar en: portal_academico (PostgreSQL)
-- ============================================================

-- 1. Columna iniciado_por_maestro en mensajes (si no existe)
ALTER TABLE mensajes
    ADD COLUMN IF NOT EXISTS iniciado_por_maestro BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Tabla tipos_evento (para comunicados categorizados)
CREATE TABLE IF NOT EXISTS tipos_evento (
    id_tipo      SERIAL PRIMARY KEY,
    nombre       VARCHAR(80)  NOT NULL,
    color_fondo  VARCHAR(20)  NOT NULL DEFAULT '#e2e8f0',
    color_texto  VARCHAR(20)  NOT NULL DEFAULT '#1e293b',
    activo       BOOLEAN      NOT NULL DEFAULT TRUE
);

-- Seeds básicos de tipos de evento
INSERT INTO tipos_evento (nombre, color_fondo, color_texto) VALUES
    ('Reunión de Padres',   '#dbeafe', '#1d4ed8'),
    ('Actividad Escolar',   '#dcfce7', '#15803d'),
    ('Comunicado General',  '#fef9c3', '#854d0e'),
    ('Examen',              '#fee2e2', '#b91c1c'),
    ('Entrega de Notas',    '#f3e8ff', '#7e22ce'),
    ('Otros',               '#e2e8f0', '#334155')
ON CONFLICT DO NOTHING;

-- 3. Tabla comunicado_aulas (relación muchos-a-muchos entre comunicados y aulas)
CREATE TABLE IF NOT EXISTS comunicado_aulas (
    id_comunicado INT NOT NULL REFERENCES comunicados(id_comunicado) ON DELETE CASCADE,
    id_aula       INT NOT NULL REFERENCES aulas(id_aula) ON DELETE CASCADE,
    PRIMARY KEY (id_comunicado, id_aula)
);

-- Poblar comunicado_aulas a partir del id_aula existente en comunicados
INSERT INTO comunicado_aulas (id_comunicado, id_aula)
SELECT id_comunicado, id_aula
FROM   comunicados
WHERE  id_aula IS NOT NULL
ON CONFLICT DO NOTHING;

-- 4. Añadir columna id_tipo_evento a comunicados (FK a tipos_evento)
ALTER TABLE comunicados
    ADD COLUMN IF NOT EXISTS id_tipo_evento INT REFERENCES tipos_evento(id_tipo) ON DELETE SET NULL;

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================


-- ==========================================
-- FILE: 22_migrate_recursos.sql
-- ==========================================

-- CREATE TABLE para recursos_biblioteca
CREATE TABLE IF NOT EXISTS recursos_biblioteca (
    id_recurso  SERIAL       PRIMARY KEY,
    nombre      VARCHAR(255) NOT NULL,
    descripcion TEXT         NOT NULL,
    url         VARCHAR(512) NOT NULL,
    categoria   VARCHAR(100) NOT NULL,
    tipo        VARCHAR(50)  NOT NULL
);

-- Seed de recursos
INSERT INTO recursos_biblioteca (nombre, descripcion, url, categoria, tipo) VALUES
('Biblioteca Virtual San Agustín', 'Accede a miles de libros, enciclopedias y lecturas digitalizadas recomendadas para secundaria.', 'https://biblioteca.sanagustin.edu.pe', 'Biblioteca Digital', 'pdf'),
('Colección de Obras Literarias', 'Lecturas clásicas y contemporáneas en formato PDF para el curso de Comunicación.', 'https://bibliotecadigital.pe/obras_clasicas', 'Biblioteca Digital', 'pdf'),
('Enciclopedia Histórica del Perú', 'Compendio histórico interactivo sobre el patrimonio cultural y sucesos históricos peruanos.', 'https://historiaperu.pe', 'Biblioteca Digital', 'url'),
('GeoGebra Clásico', 'Herramienta interactiva para geometría, álgebra, cálculo y gráficos matemáticos en tiempo real.', 'https://www.geogebra.org/classic', 'Herramientas', 'url'),
('Calculadora Desmos', 'Calculadora gráfica y científica en línea, ideal para graficar funciones complejas.', 'https://www.desmos.com/calculator', 'Herramientas', 'url'),
('Diccionario RAE', 'Consulta de dudas, significados y ortografía oficial de la Real Academia Española.', 'https://dle.rae.es', 'Herramientas', 'word'),
('Khan Academy en Español', 'Lecciones interactivas gratuitas de matemáticas, ciencia y más para todos los niveles.', 'https://es.khanacademy.org', 'Enlaces Útiles', 'url'),
('Plataforma Aprendo en Casa', 'Recursos educativos complementarios aprobados por el Ministerio de Educación.', 'https://www.aprendoencasa.pe', 'Enlaces Útiles', 'url'),
('Plantilla de Monografía en APA 7', 'Formato preestablecido en Word para la redacción de informes académicos con citas APA 7.', 'https://templates.sanagustin.edu.pe/monografia_apa7.docx', 'Plantillas', 'word'),
('Ficha de Análisis Literario', 'Plantilla de lectura guiada para analizar personajes, temas y argumento de obras.', 'https://templates.sanagustin.edu.pe/analisis_literario.docx', 'Plantillas', 'word'),
('Reglamento Interno 2026', 'Manual de convivencia, derechos, deberes y normas institucionales de San Agustín.', 'https://sanagustin.edu.pe/institucional/reglamento2026.pdf', 'Institucional', 'pdf'),
('Calendario de Efemérides', 'Fechas cívicas y festividades institucionales celebradas a lo largo del año escolar.', 'https://sanagustin.edu.pe/institucional/calendario_civico.pdf', 'Institucional', 'pdf'),
('Guía de Hábitos de Estudio', 'Consejos prácticos y técnicas de organización del tiempo para mejorar tu concentración.', 'https://support.sanagustin.edu.pe/habitos_estudio.pdf', 'Apoyo Académico', 'pdf'),
('Talleres de Reforzamiento Semanal', 'Horarios de asesorías y tutorías presenciales con los profesores del colegio.', 'https://support.sanagustin.edu.pe/talleres.pdf', 'Apoyo Académico', 'pdf'),
('Canal Educativo de Ciencias', 'Videos explicativos animados de física, química y biología para experimentos caseros.', 'https://youtube.com/c/cienciadivertida', 'Multimedia', 'youtube'),
('Audiolibros de Literatura Peruana', 'Colección de audios con las principales leyendas y tradiciones de Ricardo Palma.', 'https://audiolibros.pe/tradiciones_peruanas', 'Multimedia', 'video'),
('Club de Ciencias San Agustín', 'Inscríbete y participa en proyectos de robótica, informática y ferias de ciencias.', 'https://comunidad.sanagustin.edu.pe/club_ciencias', 'Comunidad', 'url'),
('Boletín Estudiantil "Agustino"', 'Publicaciones bimestrales redactadas por alumnos para el taller de Periodismo.', 'https://comunidad.sanagustin.edu.pe/boletin.pdf', 'Comunidad', 'pdf')
ON CONFLICT DO NOTHING;


-- ==========================================
-- FILE: 23_migrate_reportes.sql
-- ==========================================

-- ============================================================
-- MIGRACIÓN: reportes_alumno + seed
-- ============================================================

CREATE TABLE IF NOT EXISTS reportes_alumno (
    id_reporte      SERIAL       PRIMARY KEY,
    id_aula_curso   INT          NOT NULL REFERENCES aula_cursos(id_aula_curso) ON DELETE CASCADE,
    id_alumno       INT          NOT NULL REFERENCES alumnos(id_alumno)         ON DELETE CASCADE,
    id_maestro      INT          REFERENCES maestros(id_maestro)                ON DELETE CASCADE,
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
      INSERT INTO reportes_alumno (id_aula_curso, id_alumno, id_maestro, tipo, titulo, descripcion, fecha, visible_padre)
      VALUES
        (1, v_alumno1, 1, 'pendiente',         'Entregar trabajo de fracciones',
         'El alumno tiene pendiente entregar el trabajo grupal de fracciones de la semana 2.',
         CURRENT_DATE - 5, true),
        (1, v_alumno1, 1, 'felicitacion',      'Excelente participación en clase',
         'Demostró muy buen dominio de los números enteros y participó activamente.',
         CURRENT_DATE - 3, true),
        (1, v_alumno1, 1, 'anotacion',         'Cambio de horario de refuerzo',
         'El padre solicitó cambiar el horario de tutoría al viernes por la tarde.',
         CURRENT_DATE - 1, false);
    END IF;

    -- Reportes para alumno 2 en 5to Sec B
    IF v_alumno2 IS NOT NULL THEN
      INSERT INTO reportes_alumno (id_aula_curso, id_alumno, id_maestro, tipo, titulo, descripcion, fecha, visible_padre)
      VALUES
        (1, v_alumno2, 1, 'llamada_atencion',  'Conducta disruptiva en clase',
         'Se le llamó la atención por interrumpir reiteradamente durante la explicación del bimestre.',
         CURRENT_DATE - 7, true),
        (1, v_alumno2, 1, 'pendiente',         'Firma de citación pendiente',
         'El padre debe firmar y devolver la citación enviada el lunes pasado.',
         CURRENT_DATE - 2, true);
    END IF;

    -- Reportes para alumno 3 en 3ro Sec A
    IF v_alumno3 IS NOT NULL THEN
      INSERT INTO reportes_alumno (id_aula_curso, id_alumno, id_maestro, tipo, titulo, descripcion, fecha, visible_padre)
      VALUES
        (9, v_alumno3, 1, 'anotacion',         'Dificultad con ecuaciones lineales',
         'El alumno muestra dificultades al resolver ecuaciones de primer grado. Se recomienda refuerzo.',
         CURRENT_DATE - 4, true),
        (9, v_alumno3, 1, 'otro',              'Material de apoyo enviado',
         'Se envió material adicional de práctica al correo del alumno.',
         CURRENT_DATE - 1, false);
    END IF;

  END IF;
END $$;


-- ==========================================
-- FILE: 24_migrate_tareas.sql
-- ==========================================

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


-- ==========================================
-- FILE: 25_migrate_temario.sql
-- ==========================================

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


-- ==========================================
-- FILE: 50_seed_comunicados.sql
-- ==========================================

INSERT INTO comunicados (id_maestro, id_aula, titulo, descripcion, tipo, fecha_evento, fecha_creacion)
VALUES
    (
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        1,
        'Evaluación de operaciones con decimales',
        'Se evaluarán los temas de la lección 7, 8 y 9: suma y resta de decimales, multiplicación y división. Se permite calculadora. Duración: 90 minutos.',
        'examen',
        CURRENT_DATE + INTERVAL '4 days',
        NOW() - INTERVAL '1 day'
    ),
    (
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        NULL,
        'Reunión de padres de familia – Fin de bimestre',
        'Se les convoca a la reunión de padres para informar sobre el avance académico del primer bimestre. Se entregará el reporte de calificaciones parciales. Favor de llegar puntual.',
        'reunion_padres',
        CURRENT_DATE + INTERVAL '9 days',
        NOW() - INTERVAL '3 hours'
    ),
    (
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        2,
        'Actividad grupal: resolución de problemas de regla de tres',
        'Los alumnos trabajarán en equipos de 4 para resolver un set de 10 problemas aplicados. Cada equipo presentará su solución al final de la clase. Materiales: lápiz, regla, calculadora.',
        'actividad',
        CURRENT_DATE + INTERVAL '2 days',
        NOW() - INTERVAL '6 hours'
    ),
    (
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        3,
        'Paseo escolar al Parque de las Leyendas',
        'Salida a las 8:00 am desde el colegio. Los alumnos deberán traer lonchera, agua y usar ropa cómoda con el uniforme deportivo. El regreso está programado para las 3:00 pm.',
        'paseo',
        CURRENT_DATE + INTERVAL '14 days',
        NOW() - INTERVAL '2 hours'
    ),
    (
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        NULL,
        'No hay clases – Día del Maestro',
        'Con motivo del Día del Maestro Peruano, no habrá clases ese día. Las actividades se reanudan con normalidad al día siguiente.',
        'dia_festivo',
        CURRENT_DATE + INTERVAL '6 days',
        NOW() - INTERVAL '1 hour'
    );


-- ==========================================
-- FILE: 51_seed_mensajes.sql
-- ==========================================

INSERT INTO mensajes (id_padre, id_maestro, id_alumno, id_aula_curso, asunto, cuerpo, tipo, leido, fecha_envio)
VALUES
(
  (SELECT p.id_padre FROM padres p JOIN usuarios u ON u.id_usuario=p.id_usuario WHERE u.codigo='PAD-2024-00142'),
  (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
  (SELECT id_alumno FROM alumnos WHERE nombre='Juan' AND apellido='Martínez'),
  (SELECT id_aula_curso FROM aula_cursos WHERE id_aula=1 AND id_curso=1),
  'Justificante de inasistencia - Juan Martínez',
  'Estimado profesor Castillo, le informo que mi hijo Juan no pudo asistir el día lunes 19 de mayo debido a una consulta médica. Quedo atenta a cualquier tarea o avance que haya perdido. Muchas gracias.',
  'justificante', FALSE, NOW() - INTERVAL '2 hours'
),
(
  (SELECT p.id_padre FROM padres p JOIN usuarios u ON u.id_usuario=p.id_usuario WHERE u.codigo='PAD-2024-00142'),
  (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
  (SELECT id_alumno FROM alumnos WHERE nombre='Sofía' AND apellido='Martínez'),
  (SELECT id_aula_curso FROM aula_cursos WHERE id_aula=2 AND id_curso=1),
  'Consulta sobre fecha de examen de Matemática - 3ro A',
  'Profesor Oscar, buenos días. Le escribo para consultar cuándo será el próximo examen de matemática de 3ro A. Mi hija Sofía no tiene muy claro la fecha y quiero organizarle sus repasas en casa. Agradecería también si pudiera indicarme los temas. Gracias.',
  'consulta', FALSE, NOW() - INTERVAL '5 hours'
),
(
  (SELECT p.id_padre FROM padres p JOIN usuarios u ON u.id_usuario=p.id_usuario WHERE u.codigo='PAD-2024-00142'),
  (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
  (SELECT id_alumno FROM alumnos WHERE nombre='Diego' AND apellido='Martínez'),
  (SELECT id_aula_curso FROM aula_cursos WHERE id_aula=3 AND id_curso=1),
  'Ausencia justificada - Diego Martínez',
  'Estimado profesor, le comunico que Diego estuvo con fiebre los días 15 y 16 de mayo. Le adjunto el descanso médico del pediatra. Por favor indíqueme qué temas debo reforzar con él en casa para que no se atrase. Gracias por su comprensión.',
  'justificante', TRUE, NOW() - INTERVAL '2 days'
),
(
  (SELECT p.id_padre FROM padres p JOIN usuarios u ON u.id_usuario=p.id_usuario WHERE u.codigo='PAD-2024-00142'),
  (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
  (SELECT id_alumno FROM alumnos WHERE nombre='Juan' AND apellido='Martínez'),
  (SELECT id_aula_curso FROM aula_cursos WHERE id_aula=1 AND id_curso=1),
  'Consulta sobre material de refuerzo para fracciones',
  'Profesor, buenas tardes. Juan está teniendo dificultades con fracciones equivalentes. ¿Podría recomendarme algún material de práctica adicional o ejercicios en casa? Le agradecería mucho. Atentamente, Marisol.',
  'consulta', TRUE, NOW() - INTERVAL '4 days'
);

INSERT INTO mensajes_respuestas (id_mensaje, id_usuario, cuerpo, fecha)
VALUES (
  3,
  (SELECT id_usuario FROM usuarios WHERE codigo='OC16Mar26'),
  'Estimada señora Marisol, recibí el justificante de Diego. Los temas vistos durante su ausencia fueron: operaciones con decimales (lección 8) y resolución de problemas con regla de tres simple. Le sugiero que practique los ejercicios del libro de texto páginas 54-58. Cualquier duda estoy disponible. Saludos.',
  NOW() - INTERVAL '1 day'
);


-- ==========================================
-- FILE: 52_seed_mensajes_v2.sql
-- ==========================================

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


-- ==========================================
-- FILE: 53_seed_nuevo_chat.sql
-- ==========================================

-- ============================================================
-- SEED: Alumnos y padres adicionales para prueba de "Nuevo Chat"
-- Ejecutar:
--   docker cp database/seed_nuevo_chat.sql portal-academico-db:/tmp/seed_nc.sql
--   docker exec portal-academico-db psql -U sa_admin -d portal_academico -f /tmp/seed_nc.sql
-- ============================================================
SET client_encoding = 'UTF8';

-- ── Usuarios padre ─────────────────────────────────────────
INSERT INTO usuarios (codigo, email, contrasena_hash, rol, activo) VALUES
  ('PAD-2024-00301','lucia.fernandez@gmail.com',  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','padre',TRUE),
  ('PAD-2024-00302','mario.quispe@gmail.com',      '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','padre',TRUE),
  ('PAD-2024-00303','ana.ccopa@gmail.com',         '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','padre',TRUE),
  ('PAD-2024-00304','jose.lazo@gmail.com',         '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','padre',TRUE),
  ('PAD-2024-00305','rosa.ttito@gmail.com',        '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','padre',TRUE),
  ('PAD-2024-00306','carlos.mamani@gmail.com',     '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','padre',TRUE),
  ('PAD-2024-00307','elena.huanca@gmail.com',      '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','padre',TRUE),
  ('PAD-2024-00308','pedro.condori@gmail.com',     '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','padre',TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- ── Perfil padres ───────────────────────────────────────────
INSERT INTO padres (id_usuario, nombre, apellido, dni, telefono)
  SELECT id_usuario,'Lucía','Fernández A.','43100301','991100301' FROM usuarios WHERE codigo='PAD-2024-00301' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO padres (id_usuario, nombre, apellido, dni, telefono)
  SELECT id_usuario,'Mario','Quispe B.','43100302','991100302' FROM usuarios WHERE codigo='PAD-2024-00302' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO padres (id_usuario, nombre, apellido, dni, telefono)
  SELECT id_usuario,'Ana','Ccopa C.','43100303','991100303' FROM usuarios WHERE codigo='PAD-2024-00303' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO padres (id_usuario, nombre, apellido, dni, telefono)
  SELECT id_usuario,'José','Lazo D.','43100304','991100304' FROM usuarios WHERE codigo='PAD-2024-00304' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO padres (id_usuario, nombre, apellido, dni, telefono)
  SELECT id_usuario,'Rosa','Ttito E.','43100305','991100305' FROM usuarios WHERE codigo='PAD-2024-00305' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO padres (id_usuario, nombre, apellido, dni, telefono)
  SELECT id_usuario,'Carlos','Mamani F.','43100306','991100306' FROM usuarios WHERE codigo='PAD-2024-00306' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO padres (id_usuario, nombre, apellido, dni, telefono)
  SELECT id_usuario,'Elena','Huanca G.','43100307','991100307' FROM usuarios WHERE codigo='PAD-2024-00307' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO padres (id_usuario, nombre, apellido, dni, telefono)
  SELECT id_usuario,'Pedro','Condori H.','43100308','991100308' FROM usuarios WHERE codigo='PAD-2024-00308' ON CONFLICT (id_usuario) DO NOTHING;

-- ── Usuarios alumno ─────────────────────────────────────────
-- Aula 1 (5toB): 2 alumnos nuevos
INSERT INTO usuarios (codigo, email, contrasena_hash, rol, activo) VALUES
  ('5B261020','camila.fernandez@alumnos.sanagustin.edu.pe','$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','alumno',TRUE),
  ('5B261021','luis.quispe@alumnos.sanagustin.edu.pe',     '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','alumno',TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- Aula 2 (3roA): 2 alumnos nuevos
INSERT INTO usuarios (codigo, email, contrasena_hash, rol, activo) VALUES
  ('3A261022','valeria.ccopa@alumnos.sanagustin.edu.pe',  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','alumno',TRUE),
  ('3A261023','andres.lazo@alumnos.sanagustin.edu.pe',    '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','alumno',TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- Aula 9 (1roA): 2 alumnos
INSERT INTO usuarios (codigo, email, contrasena_hash, rol, activo) VALUES
  ('1A261024','sofia.ttito@alumnos.sanagustin.edu.pe',    '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','alumno',TRUE),
  ('1A261025','miguel.mamani@alumnos.sanagustin.edu.pe',  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','alumno',TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- Aula 10 (2doA): 2 alumnos
INSERT INTO usuarios (codigo, email, contrasena_hash, rol, activo) VALUES
  ('2A261026','fernanda.huanca@alumnos.sanagustin.edu.pe','$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','alumno',TRUE),
  ('2A261027','gabriel.condori@alumnos.sanagustin.edu.pe','$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','alumno',TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- Aula 12 (5toA): 2 alumnos
INSERT INTO usuarios (codigo, email, contrasena_hash, rol, activo) VALUES
  ('5A261028','daniela.flores@alumnos.sanagustin.edu.pe', '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','alumno',TRUE),
  ('5A261029','renato.ticona@alumnos.sanagustin.edu.pe',  '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','alumno',TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- Aula 11 (4toA): 2 alumnos
INSERT INTO usuarios (codigo, email, contrasena_hash, rol, activo) VALUES
  ('4A261030','nicole.apaza@alumnos.sanagustin.edu.pe',   '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','alumno',TRUE),
  ('4A261031','rodrigo.puma@alumnos.sanagustin.edu.pe',   '$2a$12$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.ucrm3yktG','alumno',TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- ── Perfil alumnos ──────────────────────────────────────────
INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
  SELECT id_usuario,'Camila','Fernández','5to Secundaria','B','2008-03-15' FROM usuarios WHERE codigo='5B261020' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
  SELECT id_usuario,'Luis','Quispe','5to Secundaria','B','2008-07-22' FROM usuarios WHERE codigo='5B261021' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
  SELECT id_usuario,'Valeria','Ccopa','3ro Secundaria','A','2010-05-10' FROM usuarios WHERE codigo='3A261022' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
  SELECT id_usuario,'Andrés','Lazo','3ro Secundaria','A','2010-11-28' FROM usuarios WHERE codigo='3A261023' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
  SELECT id_usuario,'Sofía','Ttito','1ro Secundaria','A','2012-01-08' FROM usuarios WHERE codigo='1A261024' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
  SELECT id_usuario,'Miguel','Mamani','1ro Secundaria','A','2012-09-14' FROM usuarios WHERE codigo='1A261025' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
  SELECT id_usuario,'Fernanda','Huanca','2do Secundaria','A','2011-06-30' FROM usuarios WHERE codigo='2A261026' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
  SELECT id_usuario,'Gabriel','Condori','2do Secundaria','A','2011-04-19' FROM usuarios WHERE codigo='2A261027' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
  SELECT id_usuario,'Daniela','Flores','5to Secundaria','A','2008-12-05' FROM usuarios WHERE codigo='5A261028' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
  SELECT id_usuario,'Renato','Ticona','5to Secundaria','A','2008-02-17' FROM usuarios WHERE codigo='5A261029' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
  SELECT id_usuario,'Nicole','Apaza','4to Secundaria','A','2009-08-23' FROM usuarios WHERE codigo='4A261030' ON CONFLICT (id_usuario) DO NOTHING;
INSERT INTO alumnos (id_usuario, nombre, apellido, grado, seccion, fecha_nacimiento)
  SELECT id_usuario,'Rodrigo','Puma','4to Secundaria','A','2009-10-11' FROM usuarios WHERE codigo='4A261031' ON CONFLICT (id_usuario) DO NOTHING;

-- ── Relaciones padre–hijo ───────────────────────────────────
DO $$
DECLARE
  codes TEXT[][] := ARRAY[
    ARRAY['PAD-2024-00301','5B261020'],
    ARRAY['PAD-2024-00302','5B261021'],
    ARRAY['PAD-2024-00303','3A261022'],
    ARRAY['PAD-2024-00304','3A261023'],
    ARRAY['PAD-2024-00305','1A261024'],
    ARRAY['PAD-2024-00306','1A261025'],
    ARRAY['PAD-2024-00307','2A261026'],
    ARRAY['PAD-2024-00308','2A261027'],
    ARRAY['PAD-2024-00301','5A261028'],
    ARRAY['PAD-2024-00302','5A261029'],
    ARRAY['PAD-2024-00303','4A261030'],
    ARRAY['PAD-2024-00304','4A261031']
  ];
  pair TEXT[];
  v_padre INT; v_alumno INT;
BEGIN
  FOREACH pair SLICE 1 IN ARRAY codes LOOP
    SELECT p.id_padre INTO v_padre FROM padres p JOIN usuarios u ON u.id_usuario=p.id_usuario WHERE u.codigo=pair[1];
    SELECT a.id_alumno INTO v_alumno FROM alumnos a JOIN usuarios u ON u.id_usuario=a.id_usuario WHERE u.codigo=pair[2];
    IF v_padre IS NOT NULL AND v_alumno IS NOT NULL THEN
      INSERT INTO padre_hijo (id_padre, id_alumno, parentesco, es_principal)
      VALUES (v_padre, v_alumno, 'padre', TRUE)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
END $$;

-- ── Matrículas ──────────────────────────────────────────────
INSERT INTO matriculas (id_alumno, id_aula, fecha_matricula, estado)
SELECT a.id_alumno,
  CASE u.codigo
    WHEN '5B261020' THEN 1  WHEN '5B261021' THEN 1
    WHEN '3A261022' THEN 2  WHEN '3A261023' THEN 2
    WHEN '1A261024' THEN 9  WHEN '1A261025' THEN 9
    WHEN '2A261026' THEN 10 WHEN '2A261027' THEN 10
    WHEN '5A261028' THEN 12 WHEN '5A261029' THEN 12
    WHEN '4A261030' THEN 11 WHEN '4A261031' THEN 11
  END,
  '2026-03-01', 'activa'
FROM alumnos a JOIN usuarios u ON u.id_usuario=a.id_usuario
WHERE u.codigo IN (
  '5B261020','5B261021','3A261022','3A261023',
  '1A261024','1A261025','2A261026','2A261027',
  '5A261028','5A261029','4A261030','4A261031'
)
ON CONFLICT DO NOTHING;


-- ==========================================
-- FILE: 54_seed_portal_alumno_completo.sql
-- ==========================================

-- ============================================================
-- SEED DATA: Calificaciones y Asistencia Completa para Juan Martínez (id_alumno = 1)
-- Abarca los Bimestres I, II, III y IV para los cursos de 5to Sec B (id_aula_curso 1 al 8)
-- ============================================================

-- 1. Limpiar tareas, exámenes y notas previas de estos cursos para evitar conflictos de claves únicas
DELETE FROM tareas_curso WHERE id_aula_curso BETWEEN 1 AND 8;
DELETE FROM examenes_curso WHERE id_aula_curso BETWEEN 1 AND 8;
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


-- ==========================================
-- FILE: 55_seed_test_predicciones.sql
-- ==========================================

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


-- ==========================================
-- FILE: 90_fix_encoding_temario.sql
-- ==========================================

-- ============================================================
-- FIX: Corregir títulos con caracteres corruptos en temario
-- Ejecutar este script si la BD ya fue inicializada con
-- encoding incorrecto y los títulos aparecen con ?? en lugar
-- de vocales acentuadas.
-- ============================================================

SET client_encoding = 'UTF8';

-- Corregir Unidad 1: "Introducción e Fundamentos Clave" → "Introducción y Fundamentos Clave"
-- (también corrige "Introducci??n" si el texto fue insertado con Latin-1)
UPDATE unidades_didacticas
SET titulo = 'Introducción y Fundamentos Clave'
WHERE titulo ILIKE '%ntroducci%undamentos%';

-- Corregir Unidad 3: "Optimización y Proyectos Integrales"
UPDATE unidades_didacticas
SET titulo = 'Optimización y Proyectos Integrales'
WHERE titulo ILIKE '%ptimizaci%royectos%';

-- Corregir Unidad 2 si aparece corrupta
UPDATE unidades_didacticas
SET titulo = 'Desarrollo Intermedio y Aplicaciones'
WHERE titulo ILIKE '%esarrollo%ntermedio%Aplicaciones%';

-- Corregir Unidad 4 si aparece corrupta
UPDATE unidades_didacticas
SET titulo = 'Temas Avanzados y Tendencias del Futuro'
WHERE titulo ILIKE '%emas%vanzados%endencias%';

-- Verificar resultados
SELECT id_unidad, titulo, estado FROM unidades_didacticas ORDER BY numero LIMIT 20;


-- ============================================================
-- MIGRACIÓN: student_notes (Libreta de apuntes del estudiante)
-- ============================================================
CREATE TABLE IF NOT EXISTS student_notes (
    id_nota             BIGSERIAL PRIMARY KEY,
    id_alumno           BIGINT       NOT NULL REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
    titulo              VARCHAR(150) NOT NULL,
    contenido           TEXT,
    resumen_ia          TEXT,
    fecha_creacion      TIMESTAMP    NOT NULL DEFAULT NOW(),
    fecha_actualizacion TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_student_notes_alumno ON student_notes(id_alumno);


