package pe.sanagustin.portal.service;

import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import pe.sanagustin.portal.dto.*;
import pe.sanagustin.portal.entity.*;
import pe.sanagustin.portal.enums.RolUsuario;
import pe.sanagustin.portal.repository.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

@Service
@RequiredArgsConstructor
@Transactional
public class AdminService {

    private final EntityManager em;
    private final NotaKanbanRepository notaKanbanRepository;
    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;

    // ── DASHBOARD KPIS ──────────────────────────────────────────────────
    public AdminDashboardKpisDto getDashboardKpis() {
        long totalEstudiantes = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM alumnos").getSingleResult()).longValue();
        long totalDocentes = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM maestros").getSingleResult()).longValue();
        long totalCursos = ((Number) em.createNativeQuery("SELECT COUNT(*) FROM cursos").getSingleResult()).longValue();
        double morosidad = 15.5; // Mockeado por no existir tabla finanzas aún

        return new AdminDashboardKpisDto(totalEstudiantes, totalDocentes, totalCursos, morosidad);
    }

    // ── CRUD ESTUDIANTES ────────────────────────────────────────────────
    public List<EstudianteAdminDto> getEstudiantes() {
        String sql = """
                SELECT a.id_alumno, u.codigo, a.nombre, a.apellido, a.grado, a.seccion, u.email, m.estado
                FROM alumnos a
                JOIN usuarios u ON u.id_usuario = a.id_usuario
                LEFT JOIN matriculas m ON m.id_alumno = a.id_alumno AND m.estado = 'activa'
                ORDER BY a.apellido, a.nombre
                """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();
        List<EstudianteAdminDto> list = new ArrayList<>();
        for (Object[] r : rows) {
            list.add(new EstudianteAdminDto(
                    ((Number) r[0]).longValue(),
                    (String) r[1],
                    (String) r[2],
                    (String) r[3],
                    (String) r[4],
                    (String) r[5],
                    (String) r[6],
                    r[7] != null ? (String) r[7] : "activo"
            ));
        }
        return list;
    }

    public EstudianteAdminDto crearEstudiante(GuardarEstudianteRequest req) {
        String codigo = "AL-" + (100000 + new Random().nextInt(900000));
        
        Usuario usuario = new Usuario();
        usuario.setCodigo(codigo);
        usuario.setEmail(req.email());
        usuario.setContrasenaHash(passwordEncoder.encode("password"));
        usuario.setRol(RolUsuario.alumno);
        usuario.setActivo(true);
        em.persist(usuario);

        Alumno alumno = new Alumno();
        alumno.setUsuario(usuario);
        alumno.setNombre(req.nombre());
        alumno.setApellido(req.apellido());
        alumno.setGrado(req.grado());
        alumno.setSeccion(req.seccion());
        alumno.setFechaNacimiento(LocalDate.parse(req.fechaNacimiento()));
        em.persist(alumno);

        // Crear una matrícula por defecto para el estudiante
        em.createNativeQuery("INSERT INTO matriculas (id_alumno, id_aula, fecha_matricula, estado) VALUES (:idAlumno, 1, CURRENT_DATE, 'activa')")
          .setParameter("idAlumno", alumno.getIdAlumno())
          .executeUpdate();

        return new EstudianteAdminDto(alumno.getIdAlumno(), codigo, req.nombre(), req.apellido(), req.grado(), req.seccion(), req.email(), "activa");
    }

    public EstudianteAdminDto actualizarEstudiante(Long id, GuardarEstudianteRequest req) {
        Alumno alumno = em.find(Alumno.class, id);
        if (alumno == null) throw new IllegalArgumentException("Estudiante no encontrado");

        alumno.setNombre(req.nombre());
        alumno.setApellido(req.apellido());
        alumno.setGrado(req.grado());
        alumno.setSeccion(req.seccion());
        alumno.setFechaNacimiento(LocalDate.parse(req.fechaNacimiento()));
        em.merge(alumno);

        Usuario usuario = alumno.getUsuario();
        usuario.setEmail(req.email());
        em.merge(usuario);

        return new EstudianteAdminDto(id, usuario.getCodigo(), req.nombre(), req.apellido(), req.grado(), req.seccion(), req.email(), "activa");
    }

    public void eliminarEstudiante(Long id) {
        Alumno alumno = em.find(Alumno.class, id);
        if (alumno != null) {
            Usuario usuario = alumno.getUsuario();
            em.remove(alumno);
            em.remove(usuario);
        }
    }

    public List<DocenteAdminDto> getDocentes() {
        String sql = """
                SELECT m.id_maestro, u.codigo, m.nombre, m.apellido, m.especialidad, u.email, u.activo
                FROM maestros m
                JOIN usuarios u ON u.id_usuario = m.id_usuario
                ORDER BY m.apellido, m.nombre
                """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();
        List<DocenteAdminDto> list = new ArrayList<>();
        for (Object[] r : rows) {
            list.add(new DocenteAdminDto(
                    ((Number) r[0]).longValue(),
                    (String) r[1],
                    (String) r[2],
                    (String) r[3],
                    (String) r[4],
                    (String) r[5],
                    "Académico",
                    ((Boolean) r[6])
            ));
        }
        return list;
    }

    public DocenteAdminDto crearDocente(GuardarDocenteRequest req) {
        String codigo = "DOC-" + (100000 + new Random().nextInt(900000));

        Usuario usuario = new Usuario();
        usuario.setCodigo(codigo);
        usuario.setEmail(req.email());
        usuario.setContrasenaHash(passwordEncoder.encode("password"));
        usuario.setRol(RolUsuario.maestro);
        usuario.setActivo(true);
        em.persist(usuario);

        Maestro maestro = new Maestro();
        maestro.setUsuario(usuario);
        maestro.setNombre(req.nombre());
        maestro.setApellido(req.apellido());
        maestro.setEspecialidad(req.especialidad());
        maestro.setDni(req.dni());
        maestro.setTelefono(req.telefono());
        em.persist(maestro);

        return new DocenteAdminDto(maestro.getIdMaestro(), codigo, req.nombre(), req.apellido(), req.especialidad(), req.email(), "Académico", true);
    }

    public DocenteAdminDto actualizarDocente(Long id, GuardarDocenteRequest req) {
        Maestro maestro = em.find(Maestro.class, id);
        if (maestro == null) throw new IllegalArgumentException("Docente no encontrado");

        maestro.setNombre(req.nombre());
        maestro.setApellido(req.apellido());
        maestro.setEspecialidad(req.especialidad());
        maestro.setDni(req.dni());
        maestro.setTelefono(req.telefono());
        em.merge(maestro);

        Usuario usuario = maestro.getUsuario();
        usuario.setEmail(req.email());
        em.merge(usuario);

        return new DocenteAdminDto(id, usuario.getCodigo(), req.nombre(), req.apellido(), req.especialidad(), req.email(), "Académico", usuario.getActivo());
    }

    public void eliminarDocente(Long id) {
        Maestro maestro = em.find(Maestro.class, id);
        if (maestro != null) {
            Usuario usuario = maestro.getUsuario();
            em.remove(maestro);
            em.remove(usuario);
        }
    }

    // ── CRUD PADRES ────────────────────────────────────────────────────
    public List<PadreAdminDto> getPadres() {
        String sql = """
                SELECT p.id_padre, u.codigo, p.nombre, p.apellido, u.email, p.telefono, p.dni,
                       (SELECT COALESCE(STRING_AGG(a.nombre || ' ' || a.apellido, ', '), '')
                        FROM padre_hijo ph JOIN alumnos a ON a.id_alumno = ph.id_alumno WHERE ph.id_padre = p.id_padre) AS hijos
                FROM padres p
                JOIN usuarios u ON u.id_usuario = p.id_usuario
                ORDER BY p.apellido, p.nombre
                """;
        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql).getResultList();
        List<PadreAdminDto> list = new ArrayList<>();
        for (Object[] r : rows) {
            list.add(new PadreAdminDto(
                    ((Number) r[0]).longValue(),
                    (String) r[1],
                    (String) r[2],
                    (String) r[3],
                    (String) r[4],
                    (String) r[5],
                    (String) r[6],
                    (String) r[7]
            ));
        }
        return list;
    }

    public PadreAdminDto crearPadre(GuardarPadreRequest req) {
        String codigo = "PAD-" + (100000 + new Random().nextInt(900000));

        Usuario usuario = new Usuario();
        usuario.setCodigo(codigo);
        usuario.setEmail(req.email());
        usuario.setContrasenaHash(passwordEncoder.encode("password"));
        usuario.setRol(RolUsuario.padre);
        usuario.setActivo(true);
        em.persist(usuario);

        Padre padre = new Padre();
        padre.setUsuario(usuario);
        padre.setNombre(req.nombre());
        padre.setApellido(req.apellido());
        padre.setDni(req.dni());
        padre.setTelefono(req.telefono());
        em.persist(padre);

        return new PadreAdminDto(padre.getIdPadre(), codigo, req.nombre(), req.apellido(), req.email(), req.telefono(), req.dni(), "");
    }

    public PadreAdminDto actualizarPadre(Long id, GuardarPadreRequest req) {
        Padre padre = em.find(Padre.class, id);
        if (padre == null) throw new IllegalArgumentException("Padre no encontrado");

        padre.setNombre(req.nombre());
        padre.setApellido(req.apellido());
        padre.setDni(req.dni());
        padre.setTelefono(req.telefono());
        em.merge(padre);

        Usuario usuario = padre.getUsuario();
        usuario.setEmail(req.email());
        em.merge(usuario);

        return new PadreAdminDto(id, usuario.getCodigo(), req.nombre(), req.apellido(), req.email(), req.telefono(), req.dni(), "");
    }

    public void eliminarPadre(Long id) {
        Padre padre = em.find(Padre.class, id);
        if (padre != null) {
            Usuario usuario = padre.getUsuario();
            em.remove(padre);
            em.remove(usuario);
        }
    }

    // ── CRUD KANBAN NOTES ──────────────────────────────────────────────
    public List<NotaKanbanDto> getNotasKanban() {
        return notaKanbanRepository.findAllByOrderByFechaCreacionDesc().stream().map(n -> new NotaKanbanDto(
                n.getIdNota(), n.getTitulo(), n.getDescripcion(),
                n.getPrioridad(), n.getEstado(), n.getResponsable(),
                n.getFechaLimite(), n.getEtiquetas()
        )).toList();
    }

    public NotaKanbanDto crearNotaKanban(NotaKanbanDto req) {
        NotaKanban n = new NotaKanban();
        n.setTitulo(req.titulo());
        n.setDescripcion(req.descripcion());
        n.setPrioridad(req.prioridad());
        n.setEstado(req.estado());
        n.setResponsable(req.responsable());
        n.setFechaLimite(req.fechaLimite());
        n.setEtiquetas(req.etiquetas());
        notaKanbanRepository.save(n);
        return new NotaKanbanDto(n.getIdNota(), n.getTitulo(), n.getDescripcion(), n.getPrioridad(), n.getEstado(), n.getResponsable(), n.getFechaLimite(), n.getEtiquetas());
    }

    public NotaKanbanDto actualizarNotaKanban(Long id, NotaKanbanDto req) {
        NotaKanban n = notaKanbanRepository.findById(id).orElseThrow(() -> new IllegalArgumentException("Nota no encontrada"));
        n.setTitulo(req.titulo());
        n.setDescripcion(req.descripcion());
        n.setPrioridad(req.prioridad());
        n.setEstado(req.estado());
        n.setResponsable(req.responsable());
        n.setFechaLimite(req.fechaLimite());
        n.setEtiquetas(req.etiquetas());
        notaKanbanRepository.save(n);
        return new NotaKanbanDto(n.getIdNota(), n.getTitulo(), n.getDescripcion(), n.getPrioridad(), n.getEstado(), n.getResponsable(), n.getFechaLimite(), n.getEtiquetas());
    }

    public void eliminarNotaKanban(Long id) {
        notaKanbanRepository.deleteById(id);
    }
}
