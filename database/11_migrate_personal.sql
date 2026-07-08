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
