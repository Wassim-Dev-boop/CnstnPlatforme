package com.cnstn.reservation.controller;

import com.cnstn.reservation.dto.EventReservationSummaryResponse;
import com.cnstn.reservation.dto.EventSecurityValidationRequest;
import com.cnstn.reservation.security.InternalApiKeyValidator;
import com.cnstn.reservation.service.ReservationService;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/internal/reservations/events")
public class InternalReservationWorkflowController {

    private final ReservationService reservationService;
    private final InternalApiKeyValidator internalApiKeyValidator;

    public InternalReservationWorkflowController(
            ReservationService reservationService,
            InternalApiKeyValidator internalApiKeyValidator
    ) {
        this.reservationService = reservationService;
        this.internalApiKeyValidator = internalApiKeyValidator;
    }

    @GetMapping("/{eventId}/summary")
    public EventReservationSummaryResponse summary(
            @PathVariable UUID eventId,
            @RequestHeader("X-Internal-Api-Key") String internalApiKey
    ) {
        internalApiKeyValidator.validate(internalApiKey);
        return reservationService.getEventReservationSummary(eventId);
    }

    @PutMapping("/{eventId}/security-validation")
    @ResponseStatus(HttpStatus.OK)
    public EventReservationSummaryResponse securityValidation(
            @PathVariable UUID eventId,
            @RequestHeader("X-Internal-Api-Key") String internalApiKey,
            @Valid @RequestBody EventSecurityValidationRequest request
    ) {
        internalApiKeyValidator.validate(internalApiKey);
        return reservationService.securityValidationByEvent(
                eventId,
                Boolean.TRUE.equals(request.approved()),
                request.decidedBy(),
                request.decisionComment()
        );
    }
}
