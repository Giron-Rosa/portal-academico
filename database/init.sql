-- ============================================================
-- Portal Académico - San Agustín Campus
-- Base de datos: PostgreSQL
-- ============================================================

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
