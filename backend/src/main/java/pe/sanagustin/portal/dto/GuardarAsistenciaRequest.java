package pe.sanagustin.portal.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public class GuardarAsistenciaRequest {

    @NotBlank
    private String fecha;   // "YYYY-MM-DD"

    @NotNull
    private List<RegistroAlumno> alumnos;

    public String              getFecha()   { return fecha;   }
    public void                setFecha(String v)   { fecha = v;   }
    public List<RegistroAlumno> getAlumnos() { return alumnos; }
    public void                setAlumnos(List<RegistroAlumno> v) { alumnos = v; }

    public static class RegistroAlumno {
        private long   idAlumno;
        private String estado       = "presente";
        private String justificante;

        public long   getIdAlumno()                  { return idAlumno;      }
        public void   setIdAlumno(long v)            { idAlumno = v;         }
        public String getEstado()                    { return estado;        }
        public void   setEstado(String v)            { estado = v;           }
        public String getJustificante()              { return justificante;  }
        public void   setJustificante(String v)      { justificante = v;     }
    }
}
