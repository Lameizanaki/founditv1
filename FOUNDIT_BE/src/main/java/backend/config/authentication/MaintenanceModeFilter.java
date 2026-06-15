package backend.config.authentication;

import java.io.IOException;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import backend.model.admin.AdminSetting;
import backend.repository.admin.AdminSettingRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class MaintenanceModeFilter extends OncePerRequestFilter {

	private final AdminSettingRepository adminSettingRepository;

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
			throws ServletException, IOException {
		if (isAllowedPath(request)) {
			filterChain.doFilter(request, response);
			return;
		}

		AdminSetting setting = adminSettingRepository.findById(1L).orElse(null);
		if (setting == null || !setting.isMaintenanceMode() || isAdmin()) {
			filterChain.doFilter(request, response);
			return;
		}

		response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
		response.setContentType("application/json");
		response.setCharacterEncoding("UTF-8");
		response.getWriter().write("{\"status\":\"MAINTENANCE\",\"message\":\"" + escapeJson(setting.getMaintenanceMessage()) + "\"}");
	}

	private boolean isAllowedPath(HttpServletRequest request) {
		String path = request.getRequestURI();
		return "OPTIONS".equalsIgnoreCase(request.getMethod())
				|| path.startsWith("/auth/")
				|| path.equals("/admin/settings")
				|| path.equals("/maintenance");
	}

	private boolean isAdmin() {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		return authentication != null
				&& authentication.getAuthorities().stream()
						.anyMatch(authority -> "ROLE_ADMIN".equals(authority.getAuthority()));
	}

	private String escapeJson(String value) {
		if (value == null) {
			return "";
		}
		return value.replace("\\", "\\\\").replace("\"", "\\\"");
	}
}
