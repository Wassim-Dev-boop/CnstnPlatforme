package com.cnstn.intervention.client.itequipment;

public record InternalItEquipmentOwnershipResponse(
    boolean owner,
    InternalItEquipmentSummaryResponse equipment
) {
}
