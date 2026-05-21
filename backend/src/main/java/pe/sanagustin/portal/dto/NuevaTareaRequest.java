package pe.sanagustin.portal.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de la petición POST para crear una tarea en un aula_curso.
 */
public class NuevaTareaRequest {

    @Min(1) private int    semana       = 1;
    @Min(1) private int    clase        = 1;
    @Min(1) private int    numeroTarea  = 1;

    @NotBlank @Size(max = 200)
    private String titulo;
    private String descripcion;
    private String tipoEntregable;
    private String fechaEntrega;   // "YYYY-MM-DD" opcional

    @Min(1) private int notaMaxima = 20;
    @Min(1) private int intentos   = 1;

    private String url;

    /* ── getters / setters ── */
    public int    getSemana()                { return semana;        }
    public void   setSemana(int v)           { semana = v;           }

    public int    getClase()                 { return clase;         }
    public void   setClase(int v)            { clase = v;            }

    public int    getNumeroTarea()           { return numeroTarea;   }
    public void   setNumeroTarea(int v)      { numeroTarea = v;      }

    public String getTitulo()                { return titulo;        }
    public void   setTitulo(String v)        { titulo = v;           }

    public String getDescripcion()           { return descripcion;   }
    public void   setDescripcion(String v)   { descripcion = v;      }

    public String getTipoEntregable()        { return tipoEntregable;}
    public void   setTipoEntregable(String v){ tipoEntregable = v;   }

    public String getFechaEntrega()          { return fechaEntrega;  }
    public void   setFechaEntrega(String v)  { fechaEntrega = v;     }

    public int    getNotaMaxima()            { return notaMaxima;    }
    public void   setNotaMaxima(int v)       { notaMaxima = v;       }

    public int    getIntentos()              { return intentos;      }
    public void   setIntentos(int v)         { intentos = v;         }

    public String getUrl()                   { return url;           }
    public void   setUrl(String v)           { url = v;              }
}
