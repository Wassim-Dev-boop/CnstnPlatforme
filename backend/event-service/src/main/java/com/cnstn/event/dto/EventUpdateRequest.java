package com.cnstn.event.dto;

import com.cnstn.event.entity.EventMode;
import com.cnstn.event.entity.EventType;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public record EventUpdateRequest(
        @Size(max = 150) String title,
        @Size(max = 2000) String description,
        @Future Instant startAt,
        @Future Instant endAt,
        @Size(max = 150) String location,
        EventType eventType,
        EventMode eventMode,
        Boolean onlineEvent,
        @Size(max = 60) String onlineMeetingProvider,
        @Size(max = 500) String onlineMeetingLink,
        @Size(max = 80) String onlineMeetingId,
        @Size(max = 120) String onlineMeetingPassword
) {
}
