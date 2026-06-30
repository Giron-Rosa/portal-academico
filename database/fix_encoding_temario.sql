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
