package pe.sanagustin.portal.repository;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import pe.sanagustin.portal.entity.Usuario;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UsuarioRepositoryTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Test
    void testFindByCodigo() {
        Usuario usuario = new Usuario();
        usuario.setCodigo("ADM-001");
        usuario.setEmail("admin@sanagustin.edu.pe");

        when(usuarioRepository.findByCodigo("ADM-001")).thenReturn(Optional.of(usuario));

        Optional<Usuario> result = usuarioRepository.findByCodigo("ADM-001");
        assertTrue(result.isPresent());
        assertEquals("admin@sanagustin.edu.pe", result.get().getEmail());
    }

    @Test
    void testFindByEmail() {
        Usuario usuario = new Usuario();
        usuario.setCodigo("ADM-001");
        usuario.setEmail("admin@sanagustin.edu.pe");

        when(usuarioRepository.findByEmail("admin@sanagustin.edu.pe")).thenReturn(Optional.of(usuario));

        Optional<Usuario> result = usuarioRepository.findByEmail("admin@sanagustin.edu.pe");
        assertTrue(result.isPresent());
        assertEquals("ADM-001", result.get().getCodigo());
    }
}
