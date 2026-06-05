package com.cnstn.reservation.repository;

import com.cnstn.reservation.entity.ReservationEntity;
import com.cnstn.reservation.entity.ReservationStatus;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationRepository extends JpaRepository<ReservationEntity, UUID>, JpaSpecificationExecutor<ReservationEntity> {

    boolean existsByRoom_IdAndStatusInAndStartAtLessThanAndEndAtGreaterThan(
            UUID roomId,
            Collection<ReservationStatus> statuses,
            Instant endAt,
            Instant startAt
    );

    boolean existsByEquipment_IdAndStatusInAndStartAtLessThanAndEndAtGreaterThan(
            UUID equipmentId,
            Collection<ReservationStatus> statuses,
            Instant endAt,
            Instant startAt
    );

    @Query("""
            SELECT COALESCE(SUM(
                CASE
                    WHEN r.quantityRequested IS NULL OR r.quantityRequested < 1 THEN 1
                    ELSE r.quantityRequested
                END
            ), 0)
            FROM ReservationEntity r
            WHERE r.equipment.id = :equipmentId
              AND r.status IN :statuses
              AND r.startAt < :endAt
              AND r.endAt > :startAt
            """)
    int sumEquipmentQuantityReservedOverWindow(
            @Param("equipmentId") UUID equipmentId,
            @Param("statuses") Collection<ReservationStatus> statuses,
            @Param("endAt") Instant endAt,
            @Param("startAt") Instant startAt
    );

    List<ReservationEntity> findByEventId(UUID eventId);

    List<ReservationEntity> findByEventIdAndStatus(UUID eventId, ReservationStatus status);

    @Query(
            value = """
                    SELECT COALESCE(MAX(CAST(split_part(reference_code, '-', 3) AS INTEGER)), 0)
                    FROM reservations
                    WHERE reference_code LIKE CONCAT(:prefix, '-', :yearValue, '-%')
                    """,
            nativeQuery = true
    )
    int findMaxReferenceSequenceForYear(
            @Param("prefix") String prefix,
            @Param("yearValue") int yearValue
    );
}
