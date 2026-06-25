package pe.sanagustin.portal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;

/**
 * Cuerpo de la petición POST para crear un nuevo comunicado.
 * idAulas vacía / null → comunicado general para todas las aulas.
 * fechaEvento "YYYY-MM-DD", horaEvento "HH:MM" (ambos opcionales).
 * nuevoTipo: si no es null, se inserta primero en tipos_evento y su nombre
 *            se usa como tipo del comunicado.
 */
public class NuevoComunicadoRequest {

    @NotBlank
    @Size(max = 200)
    private String titulo;

    @NotBlank
    private String tipo;           // nombre del tipo (existente o nuevo)

    private List<Long> idAulas;    // vacía/null = todos los grados

    private String descripcion;    // opcional

    private String fechaEvento;    // "YYYY-MM-DD" o null

    private String horaEvento;     // "HH:MM"      o null

    /* ── getters / setters ── */
    public String getTitulo()            { return titulo;        }
    public void   setTitulo(String v)    { this.titulo = v;      }

    public String getTipo()              { return tipo;          }
    public void   setTipo(String v)      { this.tipo = v;        }

    public List<Long> getIdAulas()       { return idAulas;       }
    public void   setIdAulas(List<Long> v){ this.idAulas = v;    }

    public String getDescripcion()       { return descripcion;    }
    public void   setDescripcion(String v){ this.descripcion = v; }

    public String getFechaEvento()       { return fechaEvento;    }
    public void   setFechaEvento(String v){ this.fechaEvento = v; }

    public String getHoraEvento()        { return horaEvento;     }
    public void   setHoraEvento(String v){ this.horaEvento = v;   }
}
