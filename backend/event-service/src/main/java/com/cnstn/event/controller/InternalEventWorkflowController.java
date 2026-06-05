package com.cnstn.event.controller;

import com.cnstn.event.dto.EventReservationContextResponse;
import com.cnstn.event.security.InternalApiKeyValidator;
import com.cnstn.event.service.EventService;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/internal/events")
public class InternalEventWorkflowController {

    private final EventService eventService;
    private final InternalApiKeyValidator internalApiKeyValidator;

    public InternalEventWorkflowController(EventService eventService, InternalApiKeyValidator internalApiKeyValidator) {
        this.eventService = eventService;
        this.internalApiKeyValidator = internalApiKeyValidator;
    }

    @GetMapping("/{eventId}/reservation-context")
    public EventReservationContextResponse reservationContext(
            @PathVariable UUID eventId,
            @RequestHeader("X-Internal-Api-Key") String internalApiKey
    ) {
        internalApiKeyValidator.validate(internalApiKey);
        return eventService.reservationContext(eventId);
    }
}
