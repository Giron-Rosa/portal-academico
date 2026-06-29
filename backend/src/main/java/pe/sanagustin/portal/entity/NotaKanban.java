package pe.sanagustin.portal.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "notas_kanban")
public class NotaKanban {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_nota")
    private Long idNota;

    @Column(nullable = false, length = 200)
    private String titulo;

    @Column(columnDefinition = "TEXT")
    private String descripcion;

    @Column(nullable = false, length = 20)
    private String prioridad; // alta | media | baja

    @Column(nullable = false, length = 20)
    private String estado; // pendiente | en_progreso | completada

    @Column(length = 100)
    private String responsable;

    @Column(name = "fecha_limite")
    private LocalDate fechaLimite;

    @Column(length = 200)
    private String etiquetas;

    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private LocalDateTime fechaCreacion = LocalDateTime.now();
}
