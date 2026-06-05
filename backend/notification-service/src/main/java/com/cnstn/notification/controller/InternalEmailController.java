package com.cnstn.notification.controller;

import com.cnstn.notification.dto.EmailSendRequest;
import com.cnstn.notification.service.EmailService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/internal/v1/emails")
public class InternalEmailController {

    private final EmailService emailService;

    public InternalEmailController(EmailService emailService) {
        this.emailService = emailService;
    }

    @PostMapping("/send")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void send(@RequestHeader(name = "X-Api-Key", required = false) String apiKey,
                     @Valid @RequestBody EmailSendRequest request) {
        emailService.sendInternalEmail(apiKey, request);
    }
}

