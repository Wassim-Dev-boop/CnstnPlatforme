package com.cnstn.reservation.client.event;

import java.util.UUID;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "event-workflow-client", url = "${app.event.base-url}")
public interface EventWorkflowClient {

    @GetMapping("/api/v1/internal/events/{eventId}/reservation-context")
    EventReservationContextResponse getReservationContext(
            @PathVariable("eventId") UUID eventId,
            @RequestHeader("X-Internal-Api-Key") String internalApiKey
    );
}
