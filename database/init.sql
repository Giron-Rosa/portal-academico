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
    id         SERIAL PRIMARY KEY,
    id_padre   INT NOT NULL REFERENCES padres(id_padre)   ON DELETE CASCADE,
    id_alumno  INT NOT NULL REFERENCES alumnos(id_alumno) ON DELETE CASCADE,
    parentesco VARCHAR(20) NOT NULL,
    UNIQUE (id_padre, id_alumno)
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
INSERT INTO padre_hijo (id_padre, id_alumno, parentesco) VALUES
    (1, 1, 'madre'),
    (1, 2, 'madre'),
    (1, 3, 'madre');
