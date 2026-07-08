package pe.sanagustin.portal.service;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import pe.sanagustin.portal.dto.NotificacionAcademicaWsDto;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificacionWsService {

    private final SimpMessagingTemplate messagingTemplate;

    @PersistenceContext
    private EntityManager em;

    public void notificarAulaCurso(long idAulaCurso, String tipo, String titulo, String descripcion, String curso) {
        String sql = """
                SELECT DISTINCT u_al.codigo AS cod_al, u_pa.codigo AS cod_pa
                FROM matriculas m
                JOIN aula_cursos ac ON ac.id_aula = m.id_aula
                JOIN alumnos al ON al.id_alumno = m.id_alumno
                JOIN usuarios u_al ON u_al.id_usuario = al.id_usuario
                LEFT JOIN padre_hijo ph ON ph.id_alumno = al.id_alumno
                LEFT JOIN padres pa ON pa.id_padre = ph.id_padre
                LEFT JOIN usuarios u_pa ON u_pa.id_usuario = pa.id_usuario
                WHERE ac.id_aula_curso = :idAulaCurso AND m.estado = 'activa'
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("idAulaCurso", idAulaCurso)
                .getResultList();

        NotificacionAcademicaWsDto payload = new NotificacionAcademicaWsDto(
                tipo, titulo, descripcion, curso, java.time.LocalDate.now().toString()
        );

        for (Object[] r : rows) {
            String codAl = (String) r[0];
            String codPa = (String) r[1];

            if (codAl != null) {
                messagingTemplate.convertAndSend("/topic/notificaciones/" + codAl, payload);
            }
            if (codPa != null) {
                messagingTemplate.convertAndSend("/topic/notificaciones/" + codPa, payload);
            }
        }
    }

    public void notificarAlumno(long idAlumno, String tipo, String titulo, String descripcion, String curso) {
        String sql = """
                SELECT DISTINCT u_al.codigo AS cod_al, u_pa.codigo AS cod_pa
                FROM alumnos al
                JOIN usuarios u_al ON u_al.id_usuario = al.id_usuario
                LEFT JOIN padre_hijo ph ON ph.id_alumno = al.id_alumno
                LEFT JOIN padres pa ON pa.id_padre = ph.id_padre
                LEFT JOIN usuarios u_pa ON u_pa.id_usuario = pa.id_usuario
                WHERE al.id_alumno = :idAlumno
                """;

        @SuppressWarnings("unchecked")
        List<Object[]> rows = em.createNativeQuery(sql)
                .setParameter("idAlumno", idAlumno)
                .getResultList();

        NotificacionAcademicaWsDto payload = new NotificacionAcademicaWsDto(
                tipo, titulo, descripcion, curso, java.time.LocalDate.now().toString()
        );

        for (Object[] r : rows) {
            String codAl = (String) r[0];
            String codPa = (String) r[1];

            if (codAl != null) {
                messagingTemplate.convertAndSend("/topic/notificaciones/" + codAl, payload);
            }
            if (codPa != null) {
                messagingTemplate.convertAndSend("/topic/notificaciones/" + codPa, payload);
            }
        }
    }
}
