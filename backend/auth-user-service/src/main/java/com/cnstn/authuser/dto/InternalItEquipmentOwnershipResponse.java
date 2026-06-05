package com.cnstn.authuser.dto;

public record InternalItEquipmentOwnershipResponse(
    boolean owner,
    InternalItEquipmentSummaryResponse equipment
) {
}
