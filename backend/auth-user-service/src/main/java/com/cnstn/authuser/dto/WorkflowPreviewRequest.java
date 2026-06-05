package com.cnstn.authuser.dto;

public record WorkflowPreviewRequest(
        String scenarioLabel,
        Boolean reservationPhysique,
        Boolean evenementPresentiel,
        Boolean evenementHybride,
        Boolean partenaireExterne,
        Boolean documentConfidentiel,
        Boolean interventionIt,
        Boolean interventionCritique
) {
}
