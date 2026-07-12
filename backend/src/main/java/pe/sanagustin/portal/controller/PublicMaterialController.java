package pe.sanagustin.portal.controller;

import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfWriter;
import jakarta.persistence.EntityManager;
import jakarta.persistence.NoResultException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;

@RestController
@RequiredArgsConstructor
public class PublicMaterialController {

    private final EntityManager em;

    @GetMapping("/material/{filename:.+}")
    public ResponseEntity<byte[]> getMaterial(@PathVariable String filename) {
        String url = "http://localhost:8080/material/" + filename;
        String titulo = null;
        String tipo = "pdf";

        try {
            Object[] row = (Object[]) em.createNativeQuery(
                    "SELECT titulo, tipo FROM materiales_curso WHERE url = :url LIMIT 1")
                    .setParameter("url", url)
                    .getSingleResult();
            titulo = (String) row[0];
            tipo = (String) row[1];
        } catch (NoResultException e) {
            // Fallback: deducir título del nombre del archivo
            String clean = filename.replace(".pdf", "").replace(".docx", "").replace(".doc", "").replace("_", " ");
            titulo = Character.toUpperCase(clean.charAt(0)) + clean.substring(1);
            if (filename.endsWith(".docx") || filename.endsWith(".doc")) {
                tipo = "word";
            }
        }

        if ("word".equalsIgnoreCase(tipo) || filename.endsWith(".docx")) {
            // Generar archivo de texto formateado como DOCX para descarga directa
            String content = "==================================================\n" +
                    "COLEGIO SAN AGUSTÍN - PORTAL ACADÉMICO\n" +
                    "==================================================\n\n" +
                    "MATERIAL DIDÁCTICO: " + titulo.toUpperCase() + "\n" +
                    "Tipo de Recurso: Documento de Trabajo (Word)\n\n" +
                    "--------------------------------------------------\n" +
                    "DESCRIPCIÓN Y CONTENIDO:\n" +
                    "--------------------------------------------------\n" +
                    "Estimado(a) estudiante, este documento contiene las actividades y \n" +
                    "ejercicios correspondientes a la sesión de clase.\n\n" +
                    "1. Lee atentamente la teoría explicada por el docente.\n" +
                    "2. Resuelve los casos prácticos propuestos.\n" +
                    "3. Presenta tus resultados en la fecha indicada a través del portal.\n\n" +
                    "Guía de desarrollo:\n" +
                    "- Revisa los ejemplos resueltos en clase antes de comenzar.\n" +
                    "- Justifica cada una de tus respuestas.\n\n" +
                    "© 2026 Colegio San Agustín. Todos los derechos reservados.\n";

            byte[] bytes = content.getBytes(StandardCharsets.UTF_8);
            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.wordprocessingml.document"))
                    .body(bytes);
        } else {
            // Generar PDF usando OpenPDF
            try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
                Document document = new Document(PageSize.A4, 50, 50, 50, 50);
                PdfWriter.getInstance(document, out);
                document.open();

                // Fuentes
                Font schoolFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, Font.NORMAL, new java.awt.Color(30, 27, 75)); // Indigo oscuro
                Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 20, Font.NORMAL, new java.awt.Color(124, 58, 237)); // Violeta
                Font sectionFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, Font.NORMAL, new java.awt.Color(30, 41, 59));
                Font bodyFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Font.NORMAL, new java.awt.Color(71, 85, 105));
                Font noteFont = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 9, Font.NORMAL, new java.awt.Color(100, 116, 139));

                // Encabezado
                Paragraph school = new Paragraph("COLEGIO SAN AGUSTÍN - PORTAL ACADÉMICO", schoolFont);
                school.setAlignment(Element.ALIGN_LEFT);
                document.add(school);

                Paragraph line = new Paragraph("----------------------------------------------------------------------------------------------------------------------------------", noteFont);
                line.setSpacingAfter(20);
                document.add(line);

                // Título
                Paragraph titlePara = new Paragraph(titulo, titleFont);
                titlePara.setAlignment(Element.ALIGN_CENTER);
                titlePara.setSpacingAfter(25);
                document.add(titlePara);

                // Sección 1: Introducción
                Paragraph sec1 = new Paragraph("1. Introducción y Conceptos Clave", sectionFont);
                sec1.setSpacingBefore(10);
                sec1.setSpacingAfter(10);
                document.add(sec1);

                String introText = "El presente documento ha sido elaborado por el docente del área con la finalidad de consolidar " +
                        "los conceptos explicados en clase. El estudio y desarrollo de este material le permitirá al estudiante " +
                        "afianzar sus habilidades cognitivas y resolver problemas similares de forma autónoma. Se recomienda leer " +
                        "las definiciones analizadas y realizar los apuntes correspondientes.";
                Paragraph p1 = new Paragraph(introText, bodyFont);
                p1.setSpacingAfter(15);
                p1.setLeading(14);
                document.add(p1);

                // Sección 2: Teoría y Pautas
                Paragraph sec2 = new Paragraph("2. Desarrollo del Tema", sectionFont);
                sec2.setSpacingBefore(10);
                sec2.setSpacingAfter(10);
                document.add(sec2);

                String theoryText = "A continuación, se presentan los puntos principales a considerar:\n" +
                        "• Análisis detallado: Cada concepto debe ser examinado en relación a su contexto de aplicación.\n" +
                        "• Metodología de resolución: Siga los pasos estructurados explicados en clase para evitar errores de cálculo o interpretación.\n" +
                        "• Consulta de fuentes: Si tiene alguna duda, puede utilizar el asistente de IA integrado en el Portal Académico para realizar preguntas específicas sobre este documento.";
                Paragraph p2 = new Paragraph(theoryText, bodyFont);
                p2.setSpacingAfter(15);
                p2.setLeading(14);
                document.add(p2);

                // Sección 3: Actividades de Aprendizaje
                Paragraph sec3 = new Paragraph("3. Ejercicios Prácticos", sectionFont);
                sec3.setSpacingBefore(10);
                sec3.setSpacingAfter(10);
                document.add(sec3);

                String exercisesText = "Resuelva las siguientes preguntas en su cuaderno o reporte:\n" +
                        "1) Realice un mapa mental que resuma los aspectos más importantes de este material.\n" +
                        "2) Formule dos preguntas o dudas que le hayan surgido durante la lectura para discutirlas en la siguiente sesión presencial.\n" +
                        "3) Desarrolle los problemas complementarios adjuntos en la guía de trabajo.";
                Paragraph p3 = new Paragraph(exercisesText, bodyFont);
                p3.setSpacingAfter(30);
                p3.setLeading(14);
                document.add(p3);

                // Pie de página
                Paragraph note = new Paragraph("Nota: Este es un documento oficial del portal académico, verificado y aprobado para uso de los alumnos del plantel.", noteFont);
                note.setAlignment(Element.ALIGN_CENTER);
                note.setSpacingBefore(40);
                document.add(note);

                document.close();
                byte[] pdfBytes = out.toByteArray();

                return ResponseEntity.ok()
                        .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                        .contentType(MediaType.APPLICATION_PDF)
                        .body(pdfBytes);
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body(("Error al generar el PDF: " + e.getMessage()).getBytes());
            }
        }
    }
}
