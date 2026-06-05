package com.cnstn.intervention.repository;

import com.cnstn.intervention.entity.ItInterventionTransitionEntity;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ItInterventionTransitionRepository extends JpaRepository<ItInterventionTransitionEntity, UUID> {

    List<ItInterventionTransitionEntity> findByIntervention_IdOrderByCreatedAtAsc(UUID interventionId);
}
