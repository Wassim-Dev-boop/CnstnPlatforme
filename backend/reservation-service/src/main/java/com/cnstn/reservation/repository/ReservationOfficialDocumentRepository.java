package com.cnstn.reservation.repository;

import com.cnstn.reservation.entity.ReservationOfficialDocumentEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReservationOfficialDocumentRepository extends JpaRepository<ReservationOfficialDocumentEntity, UUID> {

    List<ReservationOfficialDocumentEntity> findByReservationIdOrderByGeneratedAtDesc(UUID reservationId);

    Optional<ReservationOfficialDocumentEntity> findByIdAndReservationId(UUID id, UUID reservationId);

    Optional<ReservationOfficialDocumentEntity> findFirstByReservationIdOrderByGeneratedAtDesc(UUID reservationId);
}
