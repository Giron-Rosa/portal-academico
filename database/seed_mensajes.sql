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
