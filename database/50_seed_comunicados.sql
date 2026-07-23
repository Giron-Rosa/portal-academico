INSERT INTO comunicados (id_maestro, id_aula, titulo, descripcion, tipo, fecha_evento, fecha_creacion)
VALUES
    (
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        1,
        'Evaluación de operaciones con decimales',
        'Se evaluarán los temas de la lección 7, 8 y 9: suma y resta de decimales, multiplicación y división. Se permite calculadora. Duración: 90 minutos.',
        'examen',
        CURRENT_DATE + INTERVAL '4 days',
        NOW() - INTERVAL '1 day'
    ),
    (
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        NULL,
        'Reunión de padres de familia – Fin de bimestre',
        'Se les convoca a la reunión de padres para informar sobre el avance académico del primer bimestre. Se entregará el reporte de calificaciones parciales. Favor de llegar puntual.',
        'reunion_padres',
        CURRENT_DATE + INTERVAL '9 days',
        NOW() - INTERVAL '3 hours'
    ),
    (
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        2,
        'Actividad grupal: resolución de problemas de regla de tres',
        'Los alumnos trabajarán en equipos de 4 para resolver un set de 10 problemas aplicados. Cada equipo presentará su solución al final de la clase. Materiales: lápiz, regla, calculadora.',
        'actividad',
        CURRENT_DATE + INTERVAL '2 days',
        NOW() - INTERVAL '6 hours'
    ),
    (
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        3,
        'Paseo escolar al Parque de las Leyendas',
        'Salida a las 8:00 am desde el colegio. Los alumnos deberán traer lonchera, agua y usar ropa cómoda con el uniforme deportivo. El regreso está programado para las 3:00 pm.',
        'paseo',
        CURRENT_DATE + INTERVAL '14 days',
        NOW() - INTERVAL '2 hours'
    ),
    (
        (SELECT m.id_maestro FROM maestros m JOIN usuarios u ON u.id_usuario=m.id_usuario WHERE u.codigo='OC16Mar26'),
        NULL,
        'No hay clases – Día del Maestro',
        'Con motivo del Día del Maestro Peruano, no habrá clases ese día. Las actividades se reanudan con normalidad al día siguiente.',
        'dia_festivo',
        CURRENT_DATE + INTERVAL '6 days',
        NOW() - INTERVAL '1 hour'
    );
