package pe.sanagustin.portal.service;

import com.lowagie.text.Document;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.Element;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ExportService {

    private final EntityManager em;

    // ── EXPORTAR ESTUDIANTES A EXCEL ────────────────────────────────────
    public byte[] exportEstudiantesExcel() throws IOException {
        String sql = """
                SELECT a.nombre, a.apellido, u.codigo, a.grado, a.seccion, u.email, m.estado
                FROM alumnos a
                JOIN usuarios u ON u.id_usuario = a.id_usuario
                LEFT JOIN matriculas m ON m.id_alumno = a.id_alumno AND m.estado = 'activa'
                ORDER BY a.apellido, a.nombre
                """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Estudiantes");

            // Header Style
            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Headers
            Row headerRow = sheet.createRow(0);
            String[] headers = {"Código", "Nombre", "Apellido", "Grado", "Sección", "Email", "Estado"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data
            int rowIdx = 1;
            for (Object[] r : rows) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue((String) r[2]);
                row.createCell(1).setCellValue((String) r[0]);
                row.createCell(2).setCellValue((String) r[1]);
                row.createCell(3).setCellValue((String) r[3]);
                row.createCell(4).setCellValue((String) r[4]);
                row.createCell(5).setCellValue((String) r[5]);
                row.createCell(6).setCellValue(r[6] != null ? (String) r[6] : "activo");
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    // ── EXPORTAR ESTUDIANTES A PDF ──────────────────────────────────────
    public byte[] exportEstudiantesPdf() {
        String sql = """
                SELECT a.nombre, a.apellido, u.codigo, a.grado, a.seccion, u.email, m.estado
                FROM alumnos a
                JOIN usuarios u ON u.id_usuario = a.id_usuario
                LEFT JOIN matriculas m ON m.id_alumno = a.id_alumno AND m.estado = 'activa'
                ORDER BY a.apellido, a.nombre
                """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4);
            PdfWriter.getInstance(document, out);
            document.open();

            // Título principal
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 18);
            Paragraph title = new Paragraph("Reporte Consolidado de Estudiantes", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(20);
            document.add(title);

            // Metadatos
            Font metaFont = FontFactory.getFont(FontFactory.HELVETICA, 10);
            Paragraph meta = new Paragraph("Fecha de generación: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")), metaFont);
            meta.setSpacingAfter(15);
            document.add(meta);

            // Tabla
            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.5f, 2.5f, 2.5f, 2.5f, 1.0f, 3.0f});

            // Cabeceras
            String[] headers = {"Código", "Nombre", "Apellido", "Grado", "Sec.", "Email"};
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10);
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setPadding(8);
                table.addCell(cell);
            }

            // Datos
            Font dataFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
            for (Object[] r : rows) {
                table.addCell(new Phrase((String) r[2], dataFont));
                table.addCell(new Phrase((String) r[0], dataFont));
                table.addCell(new Phrase((String) r[1], dataFont));
                table.addCell(new Phrase((String) r[3], dataFont));
                table.addCell(new Phrase((String) r[4], dataFont));
                table.addCell(new Phrase((String) r[5], dataFont));
            }

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error al generar PDF de estudiantes", e);
        }
    }

    // ── EXPORTAR CURSO (ASISTENCIA Y NOTAS) A EXCEL ─────────────────────
    public byte[] exportCursoExcel(Long idAulaCurso) throws IOException {
        String sqlCursoInfo = """
                SELECT c.nombre, g.nombre AS grado, s.nombre AS seccion
                FROM aula_cursos ac
                JOIN cursos c ON c.id_curso = ac.id_curso
                JOIN aulas a ON a.id_aula = ac.id_aula
                JOIN grados g ON g.id_grado = a.id_grado
                JOIN secciones s ON s.id_seccion = a.id_seccion
                WHERE ac.id_aula_curso = :idAulaCurso
                """;
        Object[] info = (Object[]) em.createNativeQuery(sqlCursoInfo)
                .setParameter("idAulaCurso", idAulaCurso)
                .getSingleResult();

        String cursoNombre = (String) info[0];
        String aulaInfo = (String) info[1] + " " + (String) info[2];

        String sqlAlumnos = """
                SELECT al.id_alumno, al.nombre, al.apellido, u.codigo,
                       (SELECT COUNT(*) FROM asistencia_alumno WHERE id_alumno = al.id_alumno AND id_aula_curso = :idAulaCurso) AS asist_total,
                       (SELECT COUNT(*) FROM asistencia_alumno WHERE id_alumno = al.id_alumno AND id_aula_curso = :idAulaCurso AND estado IN ('presente', 'tardanza', 'justificado')) AS asist_pres,
                       COALESCE((SELECT ROUND(AVG(nt.nota)::numeric, 1) FROM notas_tarea nt 
                                 JOIN tareas_curso tc ON tc.id_tarea = nt.id_tarea 
                                 WHERE nt.id_alumno = al.id_alumno AND tc.id_aula_curso = :idAulaCurso AND nt.entregado = true AND nt.nota IS NOT NULL), 0.0) AS promedio
                FROM matriculas m
                JOIN alumnos al ON al.id_alumno = m.id_alumno
                JOIN usuarios u ON u.id_usuario = al.id_usuario
                JOIN aula_cursos ac ON ac.id_aula = m.id_aula
                WHERE ac.id_aula_curso = :idAulaCurso AND m.estado = 'activa'
                ORDER BY al.apellido, al.nombre
                """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sqlAlumnos)
                .setParameter("idAulaCurso", idAulaCurso)
                .getResultList();

        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Consolidado Curso");

            // Cabeceras de metadatos
            Row r0 = sheet.createRow(0);
            r0.createCell(0).setCellValue("Curso:");
            r0.createCell(1).setCellValue(cursoNombre);
            Row r1 = sheet.createRow(1);
            r1.createCell(0).setCellValue("Grado y Sección:");
            r1.createCell(1).setCellValue(aulaInfo);
            Row r2 = sheet.createRow(2);
            r2.createCell(0).setCellValue("Fecha de reporte:");
            r2.createCell(1).setCellValue(LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));

            // Table Headers
            CellStyle headerStyle = workbook.createCellStyle();
            org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            Row headerRow = sheet.createRow(4);
            String[] headers = {"Código", "Nombre", "Apellido", "Clases Asistidas", "Asistencia %", "Promedio"};
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Data
            int rowIdx = 5;
            for (Object[] r : rows) {
                Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue((String) r[3]);
                row.createCell(1).setCellValue((String) r[1]);
                row.createCell(2).setCellValue((String) r[2]);

                long aTotal = ((Number) r[4]).longValue();
                long aPres = ((Number) r[5]).longValue();
                double asistPct = aTotal == 0 ? 100.0 : Math.round((aPres * 100.0) / aTotal * 10.0) / 10.0;
                double promedio = ((Number) r[6]).doubleValue();

                row.createCell(3).setCellValue(aPres + "/" + aTotal);
                row.createCell(4).setCellValue(asistPct + "%");
                row.createCell(5).setCellValue(promedio);
            }

            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }

    // ── EXPORTAR CURSO A PDF ────────────────────────────────────────────
    public byte[] exportCursoPdf(Long idAulaCurso) {
        String sqlCursoInfo = """
                SELECT c.nombre, g.nombre AS grado, s.nombre AS seccion
                FROM aula_cursos ac
                JOIN cursos c ON c.id_curso = ac.id_curso
                JOIN aulas a ON a.id_aula = ac.id_aula
                JOIN grados g ON g.id_grado = a.id_grado
                JOIN secciones s ON s.id_seccion = a.id_seccion
                WHERE ac.id_aula_curso = :idAulaCurso
                """;
        Object[] info = (Object[]) em.createNativeQuery(sqlCursoInfo)
                .setParameter("idAulaCurso", idAulaCurso)
                .getSingleResult();

        String cursoNombre = (String) info[0];
        String aulaInfo = (String) info[1] + " " + (String) info[2];

        String sqlAlumnos = """
                SELECT al.id_alumno, al.nombre, al.apellido, u.codigo,
                       (SELECT COUNT(*) FROM asistencia_alumno WHERE id_alumno = al.id_alumno AND id_aula_curso = :idAulaCurso) AS asist_total,
                       (SELECT COUNT(*) FROM asistencia_alumno WHERE id_alumno = al.id_alumno AND id_aula_curso = :idAulaCurso AND estado IN ('presente', 'tardanza', 'justificado')) AS asist_pres,
                       COALESCE((SELECT ROUND(AVG(nt.nota)::numeric, 1) FROM notas_tarea nt 
                                 JOIN tareas_curso tc ON tc.id_tarea = nt.id_tarea 
                                 WHERE nt.id_alumno = al.id_alumno AND tc.id_aula_curso = :idAulaCurso AND nt.entregado = true AND nt.nota IS NOT NULL), 0.0) AS promedio
                FROM matriculas m
                JOIN alumnos al ON al.id_alumno = m.id_alumno
                JOIN usuarios u ON u.id_usuario = al.id_usuario
                JOIN aula_cursos ac ON ac.id_aula = m.id_aula
                WHERE ac.id_aula_curso = :idAulaCurso AND m.estado = 'activa'
                ORDER BY al.apellido, al.nombre
                """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sqlAlumnos)
                .setParameter("idAulaCurso", idAulaCurso)
                .getResultList();

        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4);
            PdfWriter.getInstance(document, out);
            document.open();

            // Título
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
            Paragraph title = new Paragraph("Consolidado Académico del Curso", titleFont);
            title.setAlignment(Element.ALIGN_CENTER);
            title.setSpacingAfter(15);
            document.add(title);

            // Info de Aula
            Font textFont = FontFactory.getFont(FontFactory.HELVETICA, 10);
            document.add(new Paragraph("Curso: " + cursoNombre, textFont));
            document.add(new Paragraph("Aula / Sección: " + aulaInfo, textFont));
            document.add(new Paragraph("Fecha: " + LocalDate.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")), textFont));
            document.add(new Paragraph(" ", textFont)); // Línea en blanco

            // Tabla
            PdfPTable table = new PdfPTable(5);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.5f, 3.5f, 3.5f, 2.0f, 1.5f});

            // Cabeceras
            String[] headers = {"Código", "Nombre", "Apellido", "Asistencia %", "Promedio"};
            Font headerFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
            for (String h : headers) {
                PdfPCell cell = new PdfPCell(new Phrase(h, headerFont));
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setPadding(6);
                table.addCell(cell);
            }

            // Datos
            Font dataFont = FontFactory.getFont(FontFactory.HELVETICA, 9);
            for (Object[] r : rows) {
                table.addCell(new Phrase((String) r[3], dataFont));
                table.addCell(new Phrase((String) r[1], dataFont));
                table.addCell(new Phrase((String) r[2], dataFont));

                long aTotal = ((Number) r[4]).longValue();
                long aPres = ((Number) r[5]).longValue();
                double asistPct = aTotal == 0 ? 100.0 : Math.round((aPres * 100.0) / aTotal * 10.0) / 10.0;
                double promedio = ((Number) r[6]).doubleValue();

                table.addCell(new Phrase(asistPct + "%", dataFont));
                table.addCell(new Phrase(String.valueOf(promedio), dataFont));
            }

            document.add(table);
            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            throw new RuntimeException("Error al generar PDF de curso", e);
        }
    }
}
