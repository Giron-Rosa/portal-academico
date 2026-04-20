package pe.sanagustin.portal.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import pe.sanagustin.portal.dto.LoginRequest;
import pe.sanagustin.portal.dto.LoginResponse;
import pe.sanagustin.portal.entity.Usuario;
import pe.sanagustin.portal.repository.UsuarioRepository;
import pe.sanagustin.portal.security.JwtUtil;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UsuarioRepository usuarioRepository;
    private final JwtUtil jwtUtil;

    public LoginResponse login(LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getIdentifier(), request.getContrasena())
        );

        Usuario usuario = usuarioRepository.findByCodigo(request.getIdentifier())
                .or(() -> usuarioRepository.findByEmail(request.getIdentifier()))
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        usuario.setUltimoAcceso(LocalDateTime.now());
        usuarioRepository.save(usuario);

        String token = jwtUtil.generateToken(usuario.getCodigo(), usuario.getRol().name());

        return new LoginResponse(
                token,
                usuario.getRol().name(),
                usuario.getCodigo(),
                usuario.getEmail()
        );
    }
}
