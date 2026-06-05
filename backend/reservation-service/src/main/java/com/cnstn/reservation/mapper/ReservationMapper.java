package com.cnstn.reservation.mapper;

import com.cnstn.reservation.dto.EquipmentResponse;
import com.cnstn.reservation.dto.ReservationResponse;
import com.cnstn.reservation.dto.RoomResponse;
import com.cnstn.reservation.entity.EquipmentEntity;
import com.cnstn.reservation.entity.ReservationEntity;
import com.cnstn.reservation.entity.RoomEntity;

public final class ReservationMapper {

    private ReservationMapper() {
    }

    public static RoomResponse toResponse(RoomEntity entity) {
        return new RoomResponse(
                entity.getId(),
                entity.getName(),
                entity.getLocation(),
                entity.getDescription(),
                entity.getImageUrl(),
                entity.getCapacity(),
                entity.getStatus(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public static EquipmentResponse toResponse(EquipmentEntity entity) {
        return new EquipmentResponse(
                entity.getId(),
                entity.getName(),
                entity.getSerialNumber(),
                entity.getDescription(),
                entity.getType(),
                entity.getLocation(),
                entity.getTotalQuantity(),
                entity.getAvailableQuantity(),
                entity.getStatus(),
                entity.isActive(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }

    public static ReservationResponse toResponse(ReservationEntity entity) {
        return new ReservationResponse(
                entity.getId(),
                entity.getEventId(),
                entity.getEventMode(),
                entity.getReferenceCode(),
                entity.getBusinessVersion(),
                entity.getRoom() == null ? null : entity.getRoom().getId(),
                entity.getEquipment() == null ? null : entity.getEquipment().getId(),
                entity.getQuantityRequested(),
                entity.getRequesterUsername(),
                entity.getStartAt(),
                entity.getEndAt(),
                entity.getPurpose(),
                entity.getStatus(),
                entity.isSecurityConflict(),
                entity.getSecurityCheckedBy(),
                entity.getSecurityCheckedAt(),
                entity.getSecurityDecisionComment(),
                entity.getRejectionReason(),
                entity.getCreatedAt(),
                entity.getUpdatedAt()
        );
    }
}
