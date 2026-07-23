package pe.sanagustin.portal.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import pe.sanagustin.portal.dto.SaveNoteRequest;
import pe.sanagustin.portal.dto.StudentNoteDto;
import pe.sanagustin.portal.entity.Alumno;
import pe.sanagustin.portal.entity.StudentNote;
import pe.sanagustin.portal.repository.AlumnoRepository;
import pe.sanagustin.portal.repository.StudentNoteRepository;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
@Transactional
public class StudentNoteService {

    private final StudentNoteRepository studentNoteRepository;
    private final AlumnoRepository alumnoRepository;
    private final OpenAiService openAiService;
    private final DocumentParserService documentParserService;
    private final jakarta.persistence.EntityManager em;

    private Alumno getAlumnoOrThrow(String studentCode) {
        return alumnoRepository.findByUsuarioCodigo(studentCode)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Alumno no encontrado"));
    }

    private StudentNote getNoteAndVerifyOwner(Long idNota, Long idAlumno) {
        StudentNote note = studentNoteRepository.findById(idNota)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Nota no encontrada"));
        if (!note.getAlumno().getIdAlumno().equals(idAlumno)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "No autorizado");
        }
        return note;
    }

    private StudentNoteDto toDto(StudentNote note) {
        return new StudentNoteDto(
                note.getIdNota(),
                note.getTitulo(),
                note.getContenido(),
                note.getResumenIa(),
                note.getGuionPodcast(),
                note.getUrlDocumento(),
                note.getFechaCreacion(),
                note.getFechaActualizacion()
        );
    }

    public List<StudentNoteDto> getNotes(String studentCode) {
        Alumno alumno = getAlumnoOrThrow(studentCode);
        return studentNoteRepository.findByAlumnoIdAlumnoOrderByFechaActualizacionDesc(alumno.getIdAlumno())
                .stream()
                .map(this::toDto)
                .toList();
    }

    public StudentNoteDto createNote(String studentCode, SaveNoteRequest req) {
        Alumno alumno = getAlumnoOrThrow(studentCode);
        StudentNote note = new StudentNote();
        note.setAlumno(alumno);
        note.setTitulo(req.getTitulo().trim());
        note.setContenido(req.getContenido());
        StudentNote saved = studentNoteRepository.save(note);
        return toDto(saved);
    }

    public StudentNoteDto updateNote(Long idNota, String studentCode, SaveNoteRequest req) {
        Alumno alumno = getAlumnoOrThrow(studentCode);
        StudentNote note = getNoteAndVerifyOwner(idNota, alumno.getIdAlumno());
        note.setTitulo(req.getTitulo().trim());
        note.setContenido(req.getContenido());
        StudentNote saved = studentNoteRepository.save(note);
        return toDto(saved);
    }

    public void deleteNote(Long idNota, String studentCode) {
        Alumno alumno = getAlumnoOrThrow(studentCode);
        StudentNote note = getNoteAndVerifyOwner(idNota, alumno.getIdAlumno());
        studentNoteRepository.delete(note);
    }

    public StudentNoteDto generarResumenIa(Long idNota, String studentCode) {
        Alumno alumno = getAlumnoOrThrow(studentCode);
        StudentNote note = getNoteAndVerifyOwner(idNota, alumno.getIdAlumno());

        if (note.getContenido() == null || note.getContenido().trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La nota está vacía, no se puede generar un resumen");
        }

        String systemPrompt = "Eres un tutor académico de inteligencia artificial para alumnos del Colegio San Agustín. Tu tarea es analizar los apuntes de estudio del alumno y devolver un resumen estructurado en formato Markdown. Debe incluir:\n" +
                "1. 📌 **Resumen Breve**: Una síntesis concisa de los conceptos explicados en los apuntes.\n" +
                "2. 💡 **Conceptos Clave**: Los puntos más importantes en viñetas.\n" +
                "3. ❓ **Preguntas de Autoevaluación**: 3 preguntas cortas de autoevaluación basadas en el contenido para que el alumno pueda repasar.";

        String userPrompt = String.format("Apuntes del estudiante:\nTítulo: %s\nContenido:\n%s", note.getTitulo(), note.getContenido());

        try {
            String summary = openAiService.llamarOpenAi(systemPrompt, userPrompt, false);
            if (summary != null && !summary.startsWith("ERROR_")) {
                note.setResumenIa(summary);
                StudentNote saved = studentNoteRepository.save(note);
                return toDto(saved);
            } else {
                log.error("Error al generar resumen IA: " + summary);
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, summary);
            }
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception e) {
            log.error("Excepción al generar resumen con IA", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Ocurrió un error inesperado al generar el resumen con IA: " + e.getMessage());
        }
    }

    public StudentNoteDto importNoteFromDocument(String studentCode, MultipartFile file) {
        Alumno alumno = getAlumnoOrThrow(studentCode);
        
        String filename = file.getOriginalFilename();
        if (filename == null || filename.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Nombre de archivo inválido");
        }
        
        String title = filename;
        int lastDot = filename.lastIndexOf('.');
        if (lastDot != -1) {
            title = filename.substring(0, lastDot);
        }
        
        try {
            // Save file physically so it can be previewed later
            String safeFilename = System.currentTimeMillis() + "_" + filename.replaceAll("[^a-zA-Z0-9._-]", "_");
            java.io.File uploadDir = new java.io.File("uploads/materiales");
            if (!uploadDir.exists()) uploadDir.mkdirs();
            java.io.File dest = new java.io.File(uploadDir, safeFilename);
            java.nio.file.Files.write(dest.getAbsoluteFile().toPath(), file.getBytes());

            String ext = "";
            int dotIdx = filename.lastIndexOf('.');
            if (dotIdx != -1) {
                ext = filename.substring(dotIdx).toLowerCase();
            }

            String content = documentParserService.extractTextFromLocalFile(dest, ext);
            StudentNote note = new StudentNote();
            note.setAlumno(alumno);
            note.setTitulo(title);
            note.setContenido(content);
            note.setUrlDocumento("http://localhost:8080/uploads/materiales/" + safeFilename);
            StudentNote saved = studentNoteRepository.save(note);
            return toDto(saved);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
            log.error("Error al extraer texto del documento", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error al extraer el contenido del documento: " + e.getMessage());
        }
    }

    public StudentNoteDto generarPodcast(Long idNota, String studentCode) {
        Alumno alumno = getAlumnoOrThrow(studentCode);
        StudentNote note = getNoteAndVerifyOwner(idNota, alumno.getIdAlumno());
        
        String content = note.getContenido();
        if (content == null || content.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "La nota está vacía, no se puede generar un podcast");
        }
        
        String systemPrompt = "Eres un productor de podcasts académicos del Colegio San Agustín. Tu tarea es convertir el tema de los apuntes de estudio en un guion de diálogo dinámico y educativo para un podcast corto de estudio.\n" +
                "El diálogo debe ocurrir entre dos conductores:\n" +
                "1. \"Entrevistador\": Alguien que pregunta, tiene dudas y guía la conversación de forma amigable.\n" +
                "2. \"Tutor\": El experto del Colegio San Agustín que explica los conceptos de forma sencilla y clara.\n" +
                "Requisitos de formato:\n" +
                "Debes devolver EXCLUSIVAMENTE un arreglo JSON con la siguiente estructura (no debes usar markdown ni bloques de código, solo el JSON puro):\n" +
                "[\n" +
                "  {\"locutor\": \"Entrevistador\", \"texto\": \"¡Hola! Bienvenidos a este episodio...\"},\n" +
                "  {\"locutor\": \"Tutor\", \"texto\": \"Hola. Sí, hoy hablaremos de...\"}\n" +
                "]\n" +
                "El podcast debe resumir y explicar todo el contenido de los apuntes de forma conversacional, amena y pedagógica.";
                
        String userPrompt = String.format("Apuntes del estudiante para el guion del podcast:\nTítulo: %s\nContenido:\n%s", note.getTitulo(), content);
        
        try {
            String script = openAiService.llamarOpenAi(systemPrompt, userPrompt, true);
            if (script != null && !script.startsWith("ERROR_")) {
                note.setGuionPodcast(script);
                StudentNote saved = studentNoteRepository.save(note);
                return toDto(saved);
            } else {
                log.error("Error al generar guion de podcast IA: " + script);
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, script);
            }
        } catch (ResponseStatusException rse) {
            throw rse;
        } catch (Exception e) {
            log.error("Excepción al generar guion de podcast", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error inesperado al generar el podcast: " + e.getMessage());
        }
    }

    public StudentNoteDto importarMaterial(Long idMaterial, String studentCode) {
        Alumno alumno = getAlumnoOrThrow(studentCode);

        Object[] materialRow;
        try {
            materialRow = (Object[]) em.createNativeQuery(
                    "SELECT titulo, tipo, url FROM materiales_curso WHERE id_material = :id")
                    .setParameter("id", idMaterial)
                    .getSingleResult();
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Material no encontrado");
        }

        String titulo = (String) materialRow[0];
        String tipo = (String) materialRow[1];
        String url = (String) materialRow[2];

        String contenido = "";

        if (url != null && !url.isEmpty()) {
            if ("pdf".equalsIgnoreCase(tipo) || "word".equalsIgnoreCase(tipo) || "docx".equalsIgnoreCase(tipo)) {
                java.io.InputStream is = null;
                try {
                    String filename = url.substring(url.lastIndexOf("/") + 1);
                    if (url.contains("/uploads/materiales/")) {
                        java.io.File file = new java.io.File("uploads/materiales/" + filename);
                        if (file.exists()) {
                            is = new java.io.FileInputStream(file);
                        }
                    } else if (url.contains("/material/")) {
                        org.springframework.core.io.ClassPathResource resource = 
                                new org.springframework.core.io.ClassPathResource("static/material/" + filename);
                        if (resource.exists()) {
                            is = resource.getInputStream();
                        }
                    }

                    if (is != null) {
                        try {
                            String extension = "pdf".equalsIgnoreCase(tipo) ? ".pdf" : ".docx";
                            contenido = documentParserService.extractTextFromInputStream(is, extension);
                        } finally {
                            is.close();
                        }
                    } else {
                        contenido = "El archivo del material no se encuentra en el servidor. Ruta: " + url;
                    }
                } catch (Exception e) {
                    log.error("Error al extraer texto del material " + idMaterial, e);
                    contenido = "Error al extraer contenido del documento: " + e.getMessage();
                }
            } else {
                contenido = "Material externo de tipo " + tipo + ".\nEnlace: " + url;
            }
        } else {
            contenido = "Este material no tiene un archivo o enlace asociado.";
        }

        StudentNote note = new StudentNote();
        note.setAlumno(alumno);
        note.setTitulo("Apunte: " + titulo);
        note.setContenido(contenido);
        note.setUrlDocumento(url);
        StudentNote saved = studentNoteRepository.save(note);
        return toDto(saved);
    }
}
