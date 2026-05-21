package pe.sanagustin.portal.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cuerpo de la petición POST para crear un material didáctico.
 * tipo: pdf | word | video | url | youtube
 * url: requerido si tipo = url | youtube; null para archivos físicos.
 */
public class NuevoMaterialRequest {

    @Min(1)
    private int semana = 1;

    @Min(1)
    private int clase = 1;

    @NotBlank
    @Size(max = 200)
    private String titulo;

    @NotBlank
    private String tipo;

    private String url;   // enlace externo o null

    /* ── getters / setters ── */
    public int    getSemana()           { return semana;  }
    public void   setSemana(int v)      { semana = v;     }

    public int    getClase()            { return clase;   }
    public void   setClase(int v)       { clase = v;      }

    public String getTitulo()           { return titulo;  }
    public void   setTitulo(String v)   { titulo = v;     }

    public String getTipo()             { return tipo;    }
    public void   setTipo(String v)     { tipo = v;       }

    public String getUrl()              { return url;     }
    public void   setUrl(String v)      { url = v;        }
}
