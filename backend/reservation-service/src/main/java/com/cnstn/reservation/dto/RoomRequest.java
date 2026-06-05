package com.cnstn.reservation.dto;

import com.cnstn.reservation.entity.RoomOperationalStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record RoomRequest(
        @NotBlank @Size(max = 100) String name,
        @NotBlank @Size(max = 120) String location,
        @Size(max = 400) String description,
        String imageUrl,
        @NotNull @Min(1) Integer capacity,
        RoomOperationalStatus status,
        Boolean active
) {
}
