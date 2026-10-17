package com.hotel.config;

import com.hotel.service.ServiceInterfaces.UserService;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.http.HttpMethod;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig implements WebMvcConfigurer {

    private final UserService userService;
    private final JwtRequestFilter jwtRequestFilter;
    private final JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    public SecurityConfig(@Lazy UserService userService,
                          JwtRequestFilter jwtRequestFilter,
                          JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint) {
        this.userService = userService;
        this.jwtRequestFilter = jwtRequestFilter;
        this.jwtAuthenticationEntryPoint = jwtAuthenticationEntryPoint;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:uploads/");
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider();
        authProvider.setUserDetailsService(userService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        // (SỬA) Dùng allowedOriginPatterns để mở web bằng IP LAN
        // (vd http://10.x.x.x:5173, 192.168.x.x:5173) cũng gọi được API,
        // không bị CORS chặn như khi chỉ whitelist localhost.
        // IP LAN hay thay đổi nên để mẫu wildcard theo dải cho bền.
        configuration.setAllowedOriginPatterns(Arrays.asList(
                "http://localhost:*",
                "http://127.0.0.1:*",
                "http://10.*:*",
                "http://192.168.*:*",
                "http://172.*:*"
        ));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .exceptionHandling(exception -> exception.authenticationEntryPoint(jwtAuthenticationEntryPoint))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // ============ PUBLIC - Không cần token ============
                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/api/public/**").permitAll()
                        .requestMatchers("/api/rooms").permitAll()
                        .requestMatchers("/api/rooms/**").permitAll()
                        .requestMatchers("/api/reviews").permitAll()
                        .requestMatchers(HttpMethod.GET,
                                "/api/settings/public",
                                "/api/settings/backgrounds"
                        ).permitAll()
                        .requestMatchers("/api/reviews/**").permitAll()
                        .requestMatchers("/api/upload/**").permitAll()
                        .requestMatchers("/uploads/**").permitAll()
                        .requestMatchers("/api/promotions/active").permitAll()
                        // (SỬA) Chỉ mã ĐANG CHẠY là công khai — danh sách đầy đủ (gồm mã
                        // đang tắt/hết hạn) chỉ staff xem, tránh lộ mã cho người lạ đoán
                        .requestMatchers(HttpMethod.GET, "/api/promotions", "/api/promotions/*").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers("/api/promotions/**").authenticated()

                        // 👉 VNPAY CALLBACK - cổng thanh toán gọi về (không kèm JWT)
                        .requestMatchers("/api/payments/vnpay/return").permitAll()
                        .requestMatchers("/api/payments/vnpay/ipn").permitAll()

                        // 👉 WEBSOCKET - Cho phép tất cả
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers("/ws/chat/**").permitAll()
                        .requestMatchers("/uploads/**").permitAll()

                        // (SỬA) Chat phải đăng nhập mới dùng được (trước đây mở toang không cần token)
                        .requestMatchers("/api/chat/**").authenticated()

                        // ============ CẦN TOKEN ============
                        .requestMatchers("/api/users/me/avatar").authenticated()
                        .requestMatchers("/api/users/me").authenticated()
                        // (THÊM) Khoá quyền trên ĐƠN ĐẶT PHÒNG: xem tất cả đơn / đổi trạng
                        // thái / xoá vĩnh viễn chỉ staff — trước đây rule authenticated
                        // phía dưới nuốt hết nên khách thường cũng gọi được các API này.
                        .requestMatchers(HttpMethod.GET, "/api/bookings").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.PATCH, "/api/bookings/**").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.DELETE, "/api/bookings/*/permanent").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers("/api/bookings/**").authenticated()
                        .requestMatchers("/api/notifications/**").authenticated()
                        .requestMatchers("/api/promotions/apply").authenticated()

                        // 👉 KHÁCH THANH TOÁN BOOKING CỦA MÌNH
                        .requestMatchers("/api/payments/booking/**").authenticated()
                        .requestMatchers("/api/payments/mock/**").authenticated()

                        // 👉 KHÁCH XEM CHI TIẾT 1 GIAO DỊCH CỦA MÌNH (trang kết quả thanh toán)
                        .requestMatchers("/api/payments/stats").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers(HttpMethod.GET, "/api/payments/{id}").authenticated()

                        // ============ ADMIN + RECEPTIONIST ============
                        .requestMatchers("/api/admin/**").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers("/api/users/**").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers("/api/payments/**").hasAnyRole("ADMIN", "RECEPTIONIST")
                        .requestMatchers("/api/bookings").hasAnyRole("ADMIN", "RECEPTIONIST")

                        // ============ ADMIN ONLY ============
                        .requestMatchers("/api/promotions/create").hasRole("ADMIN")
                        .requestMatchers("/api/promotions/update/**").hasRole("ADMIN")
                        .requestMatchers("/api/promotions/delete/**").hasRole("ADMIN")
                        .requestMatchers("/api/settings", "/api/settings/**").hasRole("ADMIN")

                        .anyRequest().authenticated()
                )
                .authenticationProvider(authenticationProvider())
                .addFilterBefore(jwtRequestFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
