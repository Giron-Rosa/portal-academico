package pe.sanagustin.portal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class NuevoReporteRequest {

    @NotNull
    private Long   idAlumno;

    private String tipo          = "anotacion";

    @NotBlank @Size(max = 200)
    private String titulo;

    private String descripcion;
    private String fecha;          // "YYYY-MM-DD", null = hoy
    private boolean visiblePadre  = true;

    public Long    getIdAlumno()              { return idAlumno;     }
    public void    setIdAlumno(Long v)        { idAlumno = v;        }
    public String  getTipo()                  { return tipo;         }
    public void    setTipo(String v)          { tipo = v;            }
    public String  getTitulo()                { return titulo;       }
    public void    setTitulo(String v)        { titulo = v;          }
    public String  getDescripcion()           { return descripcion;  }
    public void    setDescripcion(String v)   { descripcion = v;     }
    public String  getFecha()                 { return fecha;        }
    public void    setFecha(String v)         { fecha = v;           }
    public boolean isVisiblePadre()           { return visiblePadre; }
    public void    setVisiblePadre(boolean v) { visiblePadre = v;    }
}
