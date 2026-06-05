package com.cnstn.event.client.reservation;

public record InternalEventSecurityValidationRequest(
        Boolean approved,
        String decisionComment,
        String decidedBy
) {
}
