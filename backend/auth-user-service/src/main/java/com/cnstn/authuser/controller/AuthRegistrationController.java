package com.cnstn.authuser.controller;

import com.cnstn.authuser.dto.RegistrationRequest;
import com.cnstn.authuser.dto.PublicSignupRequest;
import com.cnstn.authuser.dto.LoginRequest;
import com.cnstn.authuser.dto.LoginResponse;
import com.cnstn.authuser.dto.LogoutRequest;
import com.cnstn.authuser.dto.SignupResponse;
import com.cnstn.authuser.dto.UserResponse;
import com.cnstn.authuser.service.AuthenticationService;
import com.cnstn.authuser.service.RegistrationService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthRegistrationController {

    private final RegistrationService registrationService;
    private final AuthenticationService authenticationService;

    public AuthRegistrationController(
            RegistrationService registrationService,
            AuthenticationService authenticationService
    ) {
        this.registrationService = registrationService;
        this.authenticationService = authenticationService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        return authenticationService.login(request);
    }

    @PostMapping("/logout")
    @PreAuthorize("isAuthenticated()")
    @ResponseStatus(HttpStatus.OK)
    public void logout(@Valid @RequestBody LogoutRequest request) {
        authenticationService.logout(request.refreshToken());
    }

    @PostMapping("/register")
    @PreAuthorize("hasRole('ADMIN')")
    @ResponseStatus(HttpStatus.CREATED)
    public UserResponse register(@Valid @RequestBody RegistrationRequest request) {
        return registrationService.register(request);
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public SignupResponse signup(@Valid @RequestBody PublicSignupRequest request) {
        registrationService.signup(request);
        return new SignupResponse("Votre demande de compte a ete envoyee. Elle doit etre validee par un administrateur.");
    }
}
