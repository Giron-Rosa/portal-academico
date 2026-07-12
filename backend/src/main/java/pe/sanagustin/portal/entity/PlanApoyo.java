package pe.sanagustin.portal.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "planes_apoyo")
public class PlanApoyo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_plan")
    private Long idPlan;

    @Column(name = "id_alumno", nullable = false)
    private Integer idAlumno;

    @Column(name = "id_maestro", nullable = false)
    private Integer idMaestro;

    @Column(name = "plan_json", nullable = false, columnDefinition = "TEXT")
    private String planJson;

    @Column(name = "checks_state", nullable = false, length = 100)
    private String checksState = "0,0,0";

    @Column(name = "feedback_1", columnDefinition = "TEXT")
    private String feedback1;

    @Column(name = "feedback_2", columnDefinition = "TEXT")
    private String feedback2;

    @Column(name = "feedback_3", columnDefinition = "TEXT")
    private String feedback3;

    @Column(name = "asistencia_reg")
    private Double asistenciaReg = 0.0;

    @Column(name = "promedio_reg")
    private Double promedioReg = 0.0;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();
}
