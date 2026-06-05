package com.cnstn.ged.repository;

import com.cnstn.ged.entity.GedReferenceCounterEntity;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import jakarta.persistence.LockModeType;

public interface GedReferenceCounterRepository extends JpaRepository<GedReferenceCounterEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from GedReferenceCounterEntity c where c.prefix = :prefix and c.yearValue = :yearValue")
    Optional<GedReferenceCounterEntity> findForUpdate(String prefix, int yearValue);
}
