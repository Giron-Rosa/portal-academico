package pe.sanagustin.portal.dto;

/**
 * Cuerpo del PATCH para actualizar la nota y/o entrega de un alumno.
 * Ambos campos son opcionales; solo se actualiza lo que se envíe.
 */
public class ActualizarNotaRequest {

    private Boolean entregado;
    private Double  nota;       // null = sin nota aún

    public Boolean getEntregado()        { return entregado; }
    public void    setEntregado(Boolean v){ entregado = v;   }

    public Double  getNota()             { return nota;      }
    public void    setNota(Double v)     { nota = v;         }
}
