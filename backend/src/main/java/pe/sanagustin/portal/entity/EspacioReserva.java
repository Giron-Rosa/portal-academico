package pe.sanagustin.portal.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "espacios_reserva")
public class EspacioReserva {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_espacio")
    private Long idEspacio;

    @Column(nullable = false, unique = true, length = 100)
    private String nombre;

    @Column(nullable = false, length = 60)
    private String area;

    @Column(name = "limite_minutos", nullable = false)
    private Integer limiteMinutos = 120;
}
