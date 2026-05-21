package pe.sanagustin.portal.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class NuevoExamenRequest {

    @Min(1) private int    semana         = 1;
    @Min(1) private int    clase          = 1;
    @Min(1) private int    numeroExamen   = 1;

    @NotBlank @Size(max = 200)
    private String titulo;
    private String descripcion;
    private String tipo          = "escrito";
    private String fechaExamen;        // "YYYY-MM-DD"
    private Integer duracionMinutos;
    @Min(1) private int notaMaxima = 20;
    private String url;

    public int     getSemana()                   { return semana;           }
    public void    setSemana(int v)              { semana = v;              }
    public int     getClase()                    { return clase;            }
    public void    setClase(int v)               { clase = v;               }
    public int     getNumeroExamen()             { return numeroExamen;     }
    public void    setNumeroExamen(int v)        { numeroExamen = v;        }
    public String  getTitulo()                   { return titulo;           }
    public void    setTitulo(String v)           { titulo = v;              }
    public String  getDescripcion()              { return descripcion;      }
    public void    setDescripcion(String v)      { descripcion = v;         }
    public String  getTipo()                     { return tipo;             }
    public void    setTipo(String v)             { tipo = v;                }
    public String  getFechaExamen()              { return fechaExamen;      }
    public void    setFechaExamen(String v)      { fechaExamen = v;         }
    public Integer getDuracionMinutos()          { return duracionMinutos;  }
    public void    setDuracionMinutos(Integer v) { duracionMinutos = v;     }
    public int     getNotaMaxima()               { return notaMaxima;       }
    public void    setNotaMaxima(int v)          { notaMaxima = v;          }
    public String  getUrl()                      { return url;              }
    public void    setUrl(String v)              { url = v;                 }
}
