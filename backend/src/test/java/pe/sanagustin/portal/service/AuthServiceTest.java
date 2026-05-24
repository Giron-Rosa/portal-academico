package pe.sanagustin.portal.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import pe.sanagustin.portal.dto.LoginRequest;
import pe.sanagustin.portal.dto.LoginResponse;
import pe.sanagustin.portal.dto.RegistroRequest;
import pe.sanagustin.portal.entity.Usuario;
import pe.sanagustin.portal.enums.RolUsuario;
import pe.sanagustin.portal.repository.UsuarioRepository;
import pe.sanagustin.portal.security.JwtUtil;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UsuarioRepository usuarioRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtUtil jwtUtil;

    @InjectMocks
    private AuthService authService;

    private Usuario usuarioMock;

    @BeforeEach
    void setUp() {
        usuarioMock = new Usuario();
        usuarioMock.setIdUsuario(1L);
        usuarioMock.setCodigo("OC16Mar26");
        usuarioMock.setEmail("oscar.castillo@sanagustin.edu.pe");
        usuarioMock.setContrasenaHash("hashed_password");
        usuarioMock.setRol(RolUsuario.maestro);
        usuarioMock.setActivo(true);
    }

    @Test
    void testLogin_UsuarioNoEncontrado() {
        LoginRequest req = new LoginRequest();
        req.setIdentifier("invalido");
        req.setContrasena("Test1234!");

        when(usuarioRepository.findByCodigo(any())).thenReturn(Optional.empty());
        when(usuarioRepository.findByEmail(any())).thenReturn(Optional.empty());

        assertThrows(UsernameNotFoundException.class, () -> authService.login(req));
    }

    @Test
    void testLogin_CuentaDesactivada() {
        LoginRequest req = new LoginRequest();
        req.setIdentifier("OC16Mar26");
        req.setContrasena("Test1234!");

        usuarioMock.setActivo(false);
        when(usuarioRepository.findByCodigo("OC16Mar26")).thenReturn(Optional.of(usuarioMock));

        assertThrows(BadCredentialsException.class, () -> authService.login(req));
    }

    @Test
    void testLogin_ContrasenaIncorrecta() {
        LoginRequest req = new LoginRequest();
        req.setIdentifier("OC16Mar26");
        req.setContrasena("wrong_password");

        when(usuarioRepository.findByCodigo("OC16Mar26")).thenReturn(Optional.of(usuarioMock));
        when(passwordEncoder.matches("wrong_password", "hashed_password")).thenReturn(false);

        assertThrows(BadCredentialsException.class, () -> authService.login(req));
    }

    @Test
    void testRegistrarUsuario_Exito() {
        RegistroRequest req = new RegistroRequest();
        req.setCodigo("NUEVO-001");
        req.setEmail("nuevo@sanagustin.edu.pe");
        req.setContrasena("ClaveSegura123");
        req.setRol("alumno");

        when(usuarioRepository.findByCodigo("NUEVO-001")).thenReturn(Optional.empty());
        when(usuarioRepository.findByEmail("nuevo@sanagustin.edu.pe")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("ClaveSegura123")).thenReturn("hashed_new_password");

        assertDoesNotThrow(() -> authService.registrarUsuario(req));
        verify(usuarioRepository, times(1)).save(any(Usuario.class));
    }

    @Test
    void testRegistrarUsuario_CodigoDuplicado() {
        RegistroRequest req = new RegistroRequest();
        req.setCodigo("OC16Mar26");
        req.setEmail("otro@sanagustin.edu.pe");
        req.setContrasena("ClaveSegura123");
        req.setRol("maestro");

        when(usuarioRepository.findByCodigo("OC16Mar26")).thenReturn(Optional.of(usuarioMock));

        IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                () -> authService.registrarUsuario(req));
        assertEquals("El código de usuario ya está registrado.", ex.getMessage());
        verify(usuarioRepository, never()).save(any());
    }
}
