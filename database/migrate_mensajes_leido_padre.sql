-- ============================================================
-- Migración: Añadir columna leido_padre a tabla mensajes
-- ============================================================

ALTER TABLE mensajes ADD COLUMN IF NOT EXISTS leido_padre BOOLEAN NOT NULL DEFAULT FALSE;

-- Marcar mensajes existentes como leídos si no son nuevos
UPDATE mensajes SET leido_padre = TRUE WHERE leido = TRUE;
