package com.cnstn.event.dto;

import com.cnstn.event.entity.EventMode;
import java.time.Instant;
import java.util.UUID;

public record EventMeetingResponse(
        UUID eventId,
        String title,
        Instant startAt,
        Instant endAt,
        EventMode eventMode,
        String meetingRoomId,
        boolean onlineAvailable
) {
}
