package pe.sanagustin.portal.service;

import lombok.extern.slf4j.Slf4j;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;

@Slf4j
@Service
public class DocumentParserService {

    public String extractText(MultipartFile file) throws Exception {
        String filename = file.getOriginalFilename();
        if (filename == null) {
            throw new IllegalArgumentException("El nombre del archivo es nulo");
        }

        int lastDot = filename.lastIndexOf('.');
        if (lastDot == -1) {
            throw new IllegalArgumentException("El archivo no tiene una extensión válida");
        }
        
        String extension = filename.substring(lastDot).toLowerCase();
        log.info("[DocumentParser] Extrayendo texto de archivo: {}, extensión: {}", filename, extension);

        try (InputStream is = file.getInputStream()) {
            if (".pdf".equals(extension)) {
                return parsePdf(is);
            } else if (".docx".equals(extension)) {
                return parseDocx(is);
            } else {
                throw new IllegalArgumentException("Formato de archivo no soportado: " + extension + ". Solo se admiten PDF y DOCX.");
            }
        }
    }

    private String parsePdf(InputStream is) throws Exception {
        byte[] bytes = is.readAllBytes();
        try (PDDocument document = Loader.loadPDF(bytes)) {
            PDFTextStripper stripper = new PDFTextStripper();
            String text = stripper.getText(document);
            return text != null ? text.trim() : "";
        }
    }

    private String parseDocx(InputStream is) throws Exception {
        try (XWPFDocument document = new XWPFDocument(is)) {
            XWPFWordExtractor extractor = new XWPFWordExtractor(document);
            String text = extractor.getText();
            return text != null ? text.trim() : "";
        }
    }

    public String extractTextFromLocalFile(java.io.File file, String extension) throws Exception {
        try (InputStream is = new java.io.FileInputStream(file)) {
            return extractTextFromInputStream(is, extension);
        }
    }

    public String extractTextFromInputStream(InputStream is, String extension) throws Exception {
        if (".pdf".equalsIgnoreCase(extension) || "pdf".equalsIgnoreCase(extension)) {
            return parsePdf(is);
        } else if (".docx".equalsIgnoreCase(extension) || "docx".equalsIgnoreCase(extension) || "word".equalsIgnoreCase(extension)) {
            return parseDocx(is);
        } else {
            throw new IllegalArgumentException("Formato no soportado: " + extension);
        }
    }
}
