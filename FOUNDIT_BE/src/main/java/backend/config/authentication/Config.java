package backend.config.authentication;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import backend.enums.authentication.Role;
import backend.repository.authentication.ClientRepository;
import backend.repository.authentication.FreelancerRepository;
import backend.repository.authentication.RegisterRepository;
import backend.repository.admin.AdminSettingRepository;
import backend.service.authentication.OAuthGoogleHandlerService;
import backend.utils.authentication.jwt.JwtLogin;
import backend.utils.authentication.jwt.JwtVerify;
import backend.utils.authentication.oauth.OAuthGoogleHandler;
import lombok.RequiredArgsConstructor;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class Config {
	
	private final UserDetailsService userDetailsService;
	private final AuthenticationConfiguration authenticationConfiguration;
	private final OAuthGoogleHandlerService authGoogleHandler;
	private final MaintenanceModeFilter maintenanceModeFilter;
	private final SuspendedAccountFilter suspendedAccountFilter;
	
	private final ClientRepository clientRepository;
	private final FreelancerRepository freelancerRepository;
	private final RegisterRepository registerRepository;
	private final AdminSettingRepository adminSettingRepository;
	
	@Value("${frontend.url}")
	private String frontendUrl;

	@Value("${GOOGLE_CLIENT_ID:}")
	private String googleClientId;

	@Value("${GOOGLE_CLIENT_SECRET:}")
	private String googleClientSecret;
	
	@Bean 
	public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception{	
		HttpSecurity security = http
				.cors(cors -> cors.configurationSource(corsConfig()))
				.csrf(csrf -> csrf.disable())
				.exceptionHandling(exception -> exception.authenticationEntryPoint((request, response, authException) -> {
					response.setStatus(401);
					response.setContentType("application/json");
					response.getWriter().write("{\"status\":\"UNAUTHORIZED\",\"message\":\"Please sign in to continue. If you just signed up or your session expired, log in again.\"}");
				}))
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authenticationProvider(getAuthenticationProvider())
				.authorizeHttpRequests(
						rq -> rq.requestMatchers("/").permitAll()
							.requestMatchers("/oauth2/**", "/login/oauth2/**").permitAll()
							.requestMatchers("/ws/**").permitAll()
							.requestMatchers(HttpMethod.POST, "/auth/register", "/auth/login", "/auth/send-code", "/auth/reset-password", "/auth/resend-code").permitAll()
							.requestMatchers(
								HttpMethod.GET,
								"/freelancer/active",
								"/freelancer/client/gigs",
								"/freelancer/client/gigs/*",
								"/freelancer/*/avatar",
								"/freelancer/*/client/profile",
								"/freelancer/*/profile/experience",
								"/freelancer/*/reviews",
								"/freelancer/*/get-rightSideBar",
								"/client/*/avatar"
							).permitAll()
							.requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
							.requestMatchers(HttpMethod.PUT, "/role/update-role").authenticated()
							// =========== CLIENT FREELANCER=======
							.requestMatchers(HttpMethod.POST, "/ekyc/**").hasAnyRole(Role.CLIENT.name(), Role.FREELANCER.name())
							.requestMatchers(HttpMethod.PUT,  "/ekyc/**", "/freelancer/client/*/freelancer/*/sidebar/*/view").hasAnyRole(Role.CLIENT.name(), Role.FREELANCER.name())
							.requestMatchers(HttpMethod.GET,  "/ekyc/review", "/ekyc/current", "/ekyc/settings", "/api/chat/**",
															  "/client/*/profile/freelancer-view",
															  "/client/*/project-history/freelancer-view",
															  "/freelancer/*/client/profile",
															  "/freelancer/client/gigs",
															  "/freelancer/client/gigs/*",
															  "/freelancer/**", "/freelancer/*/client/profile", "/project/*/requirement-file", "/view-hire-request", "/view-project")
								.hasAnyRole(Role.CLIENT.name(), Role.FREELANCER.name())
							.requestMatchers(HttpMethod.POST, "/api/chat/**").hasAnyRole(Role.CLIENT.name(), Role.FREELANCER.name())
							.requestMatchers(HttpMethod.POST, "/freelancer/*/reviews").hasAnyRole(Role.CLIENT.name())
							.requestMatchers(HttpMethod.DELETE, "/freelancer/reviews/*").hasAnyRole(Role.FREELANCER.name())
							// =========== CLIENT ===================
							.requestMatchers(HttpMethod.POST, "/client/**", "/client/hire-request").hasAnyRole(Role.CLIENT.name())				
							.requestMatchers(HttpMethod.PUT, "/client/**", "/client/*/cancel-order").hasAnyRole(Role.CLIENT.name())						
							.requestMatchers(HttpMethod.GET, "/client/**").hasAnyRole(Role.CLIENT.name())
							
							// =========== FREELANCER ================
							.requestMatchers(HttpMethod.POST, "/freelancer/**").hasAnyRole(Role.FREELANCER.name())
							.requestMatchers(HttpMethod.PUT, "/ekyc/**", "/freelancer/**", "/freelancer/project/*/accept-revision", "/freelancer/project/*/reject-revision").hasAnyRole(Role.FREELANCER.name())
							.requestMatchers(HttpMethod.GET, "/freelancer/**", "/freelancer/*/profile/experience", "/freelancer/project/*/delivery-file", "/freelancer/project/*/requirement-file", "/freelancer/view-hire-request", "/freelancer/view-project").hasAnyRole(Role.FREELANCER.name())						
							.requestMatchers(HttpMethod.GET, "/ekyc/review").hasAnyRole(Role.FREELANCER.name())	  

							// =========== PAYMENT ================
							.requestMatchers(HttpMethod.POST, "/payment/freelancer/*/confirm").hasAnyRole(Role.FREELANCER.name())
							.requestMatchers(HttpMethod.POST, "/payment/**").hasAnyRole(Role.CLIENT.name())
							.requestMatchers(HttpMethod.GET, "/payment/**").authenticated()
							// =========== ADMIN ================
							.requestMatchers(HttpMethod.GET, "/admin/**").hasAnyRole(Role.ADMIN.name())
							.requestMatchers(HttpMethod.PUT, "/admin/**").hasAnyRole(Role.ADMIN.name())
													  
					.anyRequest().authenticated()
					)
				.addFilterBefore(jwtVerify(), UsernamePasswordAuthenticationFilter.class)
				.addFilterAfter(maintenanceModeFilter, JwtVerify.class)
				.addFilterAfter(suspendedAccountFilter, MaintenanceModeFilter.class)
				.addFilterAt(jwtLoginFilter(), UsernamePasswordAuthenticationFilter.class);

		if (isGoogleOAuthConfigured()) {
			security.oauth2Login(auth ->
				auth.successHandler(
						new OAuthGoogleHandler(authGoogleHandler, frontendUrl)));
		}

		return security.build();
	}
	
	@Bean
	@ConditionalOnProperty(name = { "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET" })
	public ClientRegistrationRepository clientRegistrationRepository() {
		return new InMemoryClientRegistrationRepository(
				CommonOAuth2Provider.GOOGLE
						.getBuilder("google")
						.clientId(googleClientId)
						.clientSecret(googleClientSecret)
						.scope("openid", "email", "profile")
						.build());
	}
	
	private boolean isGoogleOAuthConfigured() {
		return googleClientId != null && !googleClientId.isBlank()
				&& googleClientSecret != null && !googleClientSecret.isBlank();
	}
	
	@Bean
	public JwtVerify jwtVerify() {
		return new JwtVerify();
	}

	@Bean
	public JwtLogin jwtLoginFilter() throws Exception {
		
		JwtLogin jwtLogin = new JwtLogin(
				getAuthenticationManager(),
				clientRepository,
	            freelancerRepository,
	            registerRepository,
				adminSettingRepository
		);
		
		jwtLogin.setAuthenticationManager(getAuthenticationManager());
		jwtLogin.setFilterProcessesUrl("/auth/login");
		return jwtLogin;
	}
	
	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder(14);
	}
	
	@Bean
	public AuthenticationProvider getAuthenticationProvider() {
		DaoAuthenticationProvider dao = new DaoAuthenticationProvider(userDetailsService);
		dao.setPasswordEncoder(passwordEncoder());
		return dao;
	}
	
	@Bean 
	public AuthenticationManager getAuthenticationManager() throws Exception {
		return authenticationConfiguration.getAuthenticationManager();
	}
	
	@Bean 
	public CorsConfigurationSource corsConfig() {
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowedOriginPatterns(List.of(
				frontendUrl,
				"http://localhost:*",
				"http://127.0.0.1:*",
				"http://192.168.*:*",
				"http://10.*:*",
				"http://172.*:*"
		));
		config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
		config.setAllowedHeaders(List.of("*"));
		config.setExposedHeaders(List.of("Authorization", "Content-Disposition"));
		config.setAllowCredentials(true);
		config.setMaxAge(3600L);
		
		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);

		return (CorsConfigurationSource) source;
	}
	
	//if used both permission and role at the same time
	/*
	  	.access(new WebExpressionAuthorizationManager(
		    "hasRole('FREELANCER') and hasAuthority('ekyc:review')"
		))
	 */
	
}
