package pe.sanagustin.portal.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "aulas")
public class Aula {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_aula")
    private Long idAula;

    @Column(name = "id_grado", nullable = false)
    private Long idGrado;

    @Column(name = "id_seccion", nullable = false)
    private Long idSeccion;

    @Column(name = "id_periodo", nullable = false)
    private Long idPeriodo;

    @Column(nullable = false, length = 15)
    private String turno = "mañana";
}
