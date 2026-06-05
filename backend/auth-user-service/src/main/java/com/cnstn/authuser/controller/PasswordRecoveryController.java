package com.cnstn.authuser.controller;

import com.cnstn.authuser.dto.ForgotPasswordRequest;
import com.cnstn.authuser.dto.PasswordResetResponse;
import com.cnstn.authuser.dto.ResetPasswordRequest;
import com.cnstn.authuser.service.PasswordRecoveryService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/password", "/api/v1/auth"})
public class PasswordRecoveryController {

    private final PasswordRecoveryService passwordRecoveryService;

    public PasswordRecoveryController(PasswordRecoveryService passwordRecoveryService) {
        this.passwordRecoveryService = passwordRecoveryService;
    }

    @PostMapping({"/forgot", "/forgot-password"})
    @ResponseStatus(HttpStatus.ACCEPTED)
    public PasswordResetResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        return passwordRecoveryService.forgotPassword(request);
    }

    @PostMapping({"/reset", "/reset-password"})
    public PasswordResetResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return passwordRecoveryService.resetPassword(request);
    }
}
