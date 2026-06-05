package com.cnstn.reservation.repository;

import com.cnstn.reservation.entity.ReservationReferenceCounterEntity;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservationReferenceCounterRepository extends JpaRepository<ReservationReferenceCounterEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT counter
            FROM ReservationReferenceCounterEntity counter
            WHERE counter.prefix = :prefix
              AND counter.yearValue = :yearValue
            """)
    Optional<ReservationReferenceCounterEntity> findForUpdate(
            @Param("prefix") String prefix,
            @Param("yearValue") int yearValue
    );
}
