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
