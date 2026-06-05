package com.cnstn.event.client.reservation;

import java.util.UUID;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "reservation-workflow-client", url = "${app.reservation.base-url}")
public interface ReservationWorkflowClient {

    @GetMapping("/api/v1/internal/reservations/events/{eventId}/summary")
    InternalEventReservationSummaryResponse getEventSummary(
            @PathVariable("eventId") UUID eventId,
            @RequestHeader("X-Internal-Api-Key") String internalApiKey
    );

    @PutMapping("/api/v1/internal/reservations/events/{eventId}/security-validation")
    InternalEventReservationSummaryResponse applySecurityDecision(
            @PathVariable("eventId") UUID eventId,
            @RequestHeader("X-Internal-Api-Key") String internalApiKey,
            @RequestBody InternalEventSecurityValidationRequest request
    );
}
