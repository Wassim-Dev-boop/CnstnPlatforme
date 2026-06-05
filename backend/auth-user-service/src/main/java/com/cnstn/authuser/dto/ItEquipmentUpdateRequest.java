package com.cnstn.authuser.dto;

import java.util.UUID;

public record ItEquipmentUpdateRequest(
    String name,
    String serialNumber,
    UUID categoryId,
    String brand,
    String model,
    String state,
    String description
) {
}