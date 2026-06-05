package com.cnstn.event.repository;

import com.cnstn.event.entity.EventReferenceCounterEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;

public interface EventReferenceCounterRepository extends JpaRepository<EventReferenceCounterEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT counter
            FROM EventReferenceCounterEntity counter
            WHERE counter.prefix = :prefix
              AND counter.yearValue = :yearValue
            """)
    Optional<EventReferenceCounterEntity> findForUpdate(
            @Param("prefix") String prefix,
            @Param("yearValue") int yearValue
    );
}
