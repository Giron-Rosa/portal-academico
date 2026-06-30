package pe.sanagustin.portal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de la petición POST para crear un nuevo comunicado.
 * idAula = null → comunicado general para todas las aulas del docente.
 * fechaEvento en formato "YYYY-MM-DD" (input[type=date] de HTML).
 */
public class NuevoComunicadoRequest {

    @NotBlank
    @Size(max = 200)
    private String titulo;

    @NotBlank
    private String tipo;

    private Long   idAula;      // null = todos los grados
    private java.util.List<Long> idAulas;

    private String descripcion; // opcional

    private String fechaEvento; // "YYYY-MM-DD" o null

    /* ── getters / setters ── */
    public String getTitulo()        { return titulo;        }
    public void   setTitulo(String v){ this.titulo = v;      }

    public String getTipo()          { return tipo;          }
    public void   setTipo(String v)  { this.tipo = v;        }

    public Long   getIdAula()        { return idAula;        }
    public void   setIdAula(Long v)  { this.idAula = v;      }

    public java.util.List<Long> getIdAulas() { return idAulas; }
    public void setIdAulas(java.util.List<Long> v) { this.idAulas = v; }

    public String getDescripcion()       { return descripcion;    }
    public void   setDescripcion(String v){ this.descripcion = v; }

    public String getFechaEvento()       { return fechaEvento;    }
    public void   setFechaEvento(String v){ this.fechaEvento = v; }
}
