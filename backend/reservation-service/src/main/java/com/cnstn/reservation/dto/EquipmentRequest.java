package com.cnstn.reservation.dto;

import com.cnstn.reservation.entity.EquipmentOperationalStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record EquipmentRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 100) String serialNumber,
        @Size(max = 400) String description,
        @NotBlank @Size(max = 80) String type,
        @Size(max = 120) String location,
        @NotNull @Min(1) Integer totalQuantity,
        @NotNull @Min(0) Integer availableQuantity,
        EquipmentOperationalStatus status,
        Boolean active
) {
}
