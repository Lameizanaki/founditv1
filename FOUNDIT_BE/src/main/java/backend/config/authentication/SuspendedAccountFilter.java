package backend.config.authentication;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import backend.enums.admin.UserStatus;
import backend.enums.authentication.Role;
import backend.model.authentication.Register;
import backend.repository.authentication.RegisterRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class SuspendedAccountFilter extends OncePerRequestFilter {
    private final RegisterRepository registerRepository;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null || isAllowedPath(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }

        Register user = registerRepository.findByEmail(auth.getName()).orElse(null);
        if (user != null
                && user.getStatus() == UserStatus.SUSPENDED
                && user.getRole() != Role.ADMIN) {
            response.setStatus(423);
            response.setContentType("application/json");
            response.setCharacterEncoding("UTF-8");
            response.getWriter().write("{\"status\":\"SUSPENDED\",\"message\":\"Account is suspended. Submit a review request to admin.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    private boolean isAllowedPath(String path) {
        return path.startsWith("/account/status")
                || path.startsWith("/account/reports")
                || path.startsWith("/auth/")
                || path.startsWith("/ws/");
    }
}
