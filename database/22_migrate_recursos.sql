-- CREATE TABLE para recursos_biblioteca
CREATE TABLE IF NOT EXISTS recursos_biblioteca (
    id_recurso  SERIAL       PRIMARY KEY,
    nombre      VARCHAR(255) NOT NULL,
    descripcion TEXT         NOT NULL,
    url         VARCHAR(512) NOT NULL,
    categoria   VARCHAR(100) NOT NULL,
    tipo        VARCHAR(50)  NOT NULL
);

-- Seed de recursos
INSERT INTO recursos_biblioteca (nombre, descripcion, url, categoria, tipo) VALUES
('Biblioteca Virtual San Agustín', 'Accede a miles de libros, enciclopedias y lecturas digitalizadas recomendadas para secundaria.', 'https://biblioteca.sanagustin.edu.pe', 'Biblioteca Digital', 'pdf'),
('Colección de Obras Literarias', 'Lecturas clásicas y contemporáneas en formato PDF para el curso de Comunicación.', 'https://bibliotecadigital.pe/obras_clasicas', 'Biblioteca Digital', 'pdf'),
('Enciclopedia Histórica del Perú', 'Compendio histórico interactivo sobre el patrimonio cultural y sucesos históricos peruanos.', 'https://historiaperu.pe', 'Biblioteca Digital', 'url'),
('GeoGebra Clásico', 'Herramienta interactiva para geometría, álgebra, cálculo y gráficos matemáticos en tiempo real.', 'https://www.geogebra.org/classic', 'Herramientas', 'url'),
('Calculadora Desmos', 'Calculadora gráfica y científica en línea, ideal para graficar funciones complejas.', 'https://www.desmos.com/calculator', 'Herramientas', 'url'),
('Diccionario RAE', 'Consulta de dudas, significados y ortografía oficial de la Real Academia Española.', 'https://dle.rae.es', 'Herramientas', 'word'),
('Khan Academy en Español', 'Lecciones interactivas gratuitas de matemáticas, ciencia y más para todos los niveles.', 'https://es.khanacademy.org', 'Enlaces Útiles', 'url'),
('Plataforma Aprendo en Casa', 'Recursos educativos complementarios aprobados por el Ministerio de Educación.', 'https://www.aprendoencasa.pe', 'Enlaces Útiles', 'url'),
('Plantilla de Monografía en APA 7', 'Formato preestablecido en Word para la redacción de informes académicos con citas APA 7.', 'https://templates.sanagustin.edu.pe/monografia_apa7.docx', 'Plantillas', 'word'),
('Ficha de Análisis Literario', 'Plantilla de lectura guiada para analizar personajes, temas y argumento de obras.', 'https://templates.sanagustin.edu.pe/analisis_literario.docx', 'Plantillas', 'word'),
('Reglamento Interno 2026', 'Manual de convivencia, derechos, deberes y normas institucionales de San Agustín.', 'https://sanagustin.edu.pe/institucional/reglamento2026.pdf', 'Institucional', 'pdf'),
('Calendario de Efemérides', 'Fechas cívicas y festividades institucionales celebradas a lo largo del año escolar.', 'https://sanagustin.edu.pe/institucional/calendario_civico.pdf', 'Institucional', 'pdf'),
('Guía de Hábitos de Estudio', 'Consejos prácticos y técnicas de organización del tiempo para mejorar tu concentración.', 'https://support.sanagustin.edu.pe/habitos_estudio.pdf', 'Apoyo Académico', 'pdf'),
('Talleres de Reforzamiento Semanal', 'Horarios de asesorías y tutorías presenciales con los profesores del colegio.', 'https://support.sanagustin.edu.pe/talleres.pdf', 'Apoyo Académico', 'pdf'),
('Canal Educativo de Ciencias', 'Videos explicativos animados de física, química y biología para experimentos caseros.', 'https://youtube.com/c/cienciadivertida', 'Multimedia', 'youtube'),
('Audiolibros de Literatura Peruana', 'Colección de audios con las principales leyendas y tradiciones de Ricardo Palma.', 'https://audiolibros.pe/tradiciones_peruanas', 'Multimedia', 'video'),
('Club de Ciencias San Agustín', 'Inscríbete y participa en proyectos de robótica, informática y ferias de ciencias.', 'https://comunidad.sanagustin.edu.pe/club_ciencias', 'Comunidad', 'url'),
('Boletín Estudiantil "Agustino"', 'Publicaciones bimestrales redactadas por alumnos para el taller de Periodismo.', 'https://comunidad.sanagustin.edu.pe/boletin.pdf', 'Comunidad', 'pdf')
ON CONFLICT DO NOTHING;
