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
