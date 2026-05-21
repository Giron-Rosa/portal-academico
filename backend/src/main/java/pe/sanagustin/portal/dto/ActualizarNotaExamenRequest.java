package pe.sanagustin.portal.dto;

public class ActualizarNotaExamenRequest {
    private Boolean asistio;
    private Double  nota;

    public Boolean getAsistio()        { return asistio;  }
    public void    setAsistio(Boolean v){ asistio = v;    }
    public Double  getNota()           { return nota;     }
    public void    setNota(Double v)   { nota = v;        }
}
