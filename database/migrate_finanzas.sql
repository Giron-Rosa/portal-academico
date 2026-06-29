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
