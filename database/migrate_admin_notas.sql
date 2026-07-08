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
