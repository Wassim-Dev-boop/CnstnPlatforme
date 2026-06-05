package com.cnstn.event.repository;

import com.cnstn.event.entity.EventEntity;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EventRepository extends JpaRepository<EventEntity, UUID>, JpaSpecificationExecutor<EventEntity> {

    @Query(
            value = """
                    SELECT COALESCE(MAX(CAST(split_part(reference_code, '-', 3) AS INTEGER)), 0)
                    FROM events
                    WHERE reference_code LIKE CONCAT(:prefix, '-', :yearValue, '-%')
                    """,
            nativeQuery = true
    )
    int findMaxReferenceSequence(
            @Param("prefix") String prefix,
            @Param("yearValue") int yearValue
    );
}
