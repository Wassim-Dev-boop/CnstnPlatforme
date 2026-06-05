package com.cnstn.authuser.service;

import com.cnstn.authuser.dto.InternalItEquipmentOwnershipResponse;
import com.cnstn.authuser.dto.InternalItEquipmentSummaryResponse;
import com.cnstn.authuser.dto.ItEquipmentCreateRequest;
import com.cnstn.authuser.dto.ItEquipmentResponse;
import com.cnstn.authuser.dto.ItEquipmentUpdateRequest;
import com.cnstn.authuser.entity.ItEquipmentAssignmentEntity;
import com.cnstn.authuser.entity.ItEquipmentCategoryEntity;
import com.cnstn.authuser.entity.ItEquipmentEntity;
import com.cnstn.authuser.entity.ItEquipmentState;
import com.cnstn.authuser.entity.UserEntity;
import com.cnstn.authuser.exception.BadRequestException;
import com.cnstn.authuser.exception.ConflictException;
import com.cnstn.authuser.exception.ResourceNotFoundException;
import com.cnstn.authuser.repository.ItEquipmentAssignmentRepository;
import com.cnstn.authuser.repository.ItEquipmentCategoryRepository;
import com.cnstn.authuser.repository.ItEquipmentRepository;
import com.cnstn.authuser.repository.UserRepository;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ItEquipmentService {

    private final ItEquipmentRepository equipmentRepository;
    private final ItEquipmentCategoryRepository categoryRepository;
    private final ItEquipmentAssignmentRepository assignmentRepository;
    private final UserRepository userRepository;

    public ItEquipmentService(
        ItEquipmentRepository equipmentRepository,
        ItEquipmentCategoryRepository categoryRepository,
        ItEquipmentAssignmentRepository assignmentRepository,
        UserRepository userRepository
    ) {
        this.equipmentRepository = equipmentRepository;
        this.categoryRepository = categoryRepository;
        this.assignmentRepository = assignmentRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<ItEquipmentResponse> listAll(Pageable pageable) {
        return mapPageToResponse(equipmentRepository.findAllActive(pageable));
    }

    @Transactional(readOnly = true)
    public Page<ItEquipmentResponse> search(String search, Pageable pageable) {
        String normalizedSearch = normalize(search);
        return mapPageToResponse(equipmentRepository.searchActive(normalizedSearch, pageable));
    }

    @Transactional(readOnly = true)
    public Page<ItEquipmentResponse> filterByCategory(UUID categoryId, Pageable pageable) {
        return mapPageToResponse(equipmentRepository.findByCategoryActive(
            Objects.requireNonNull(categoryId),
            pageable
        ));
    }

    @Transactional(readOnly = true)
    public Page<ItEquipmentResponse> filterByState(String state, Pageable pageable) {
        return mapPageToResponse(equipmentRepository.findByStateActive(parseState(state), pageable));
    }

    @Transactional(readOnly = true)
    public Page<ItEquipmentResponse> filterByAssignmentStatus(String assignmentStatus, Pageable pageable) {
        return mapPageToResponse(equipmentRepository.findByAssignmentStatusActive(
            normalizeAssignmentStatus(assignmentStatus),
            pageable
        ));
    }

    @Transactional(readOnly = true)
    public ItEquipmentResponse getById(UUID id) {
        ItEquipmentEntity entity = fetchEquipment(id);
        ItEquipmentAssignmentEntity assignment = assignmentRepository.findActiveByEquipmentId(entity.getId()).orElse(null);
        return toResponse(entity, assignment, resolveEmployeeName(entity, assignment));
    }

    @Transactional
    public ItEquipmentResponse create(ItEquipmentCreateRequest request) {
        String serialNumber = normalize(request.serialNumber());
        if (equipmentRepository.findBySerialNumber(serialNumber).isPresent()) {
            throw new ConflictException("Le numero de serie existe deja: " + serialNumber);
        }

        ItEquipmentCategoryEntity category = fetchCategory(request.categoryId());

        ItEquipmentEntity entity = new ItEquipmentEntity();
        entity.setName(requireNonBlank(request.name(), "Le nom est obligatoire."));
        entity.setSerialNumber(serialNumber);
        entity.setCategory(category);
        entity.setBrand(normalizeOrNull(request.brand()));
        entity.setModel(normalizeOrNull(request.model()));
        entity.setDescription(normalizeOrNull(request.description()));
        entity.setState(parseState(request.state()));
        entity.setAssignmentStatus("NOT_ASSIGNED");

        ItEquipmentEntity saved = equipmentRepository.save(entity);
        return toResponse(saved, null, null);
    }

    @Transactional
    public ItEquipmentResponse update(UUID id, ItEquipmentUpdateRequest request) {
        ItEquipmentEntity entity = fetchEquipment(id);

        if (request.name() != null) {
            entity.setName(requireNonBlank(request.name(), "Le nom est obligatoire."));
        }
        if (request.serialNumber() != null) {
            String serialNumber = requireNonBlank(request.serialNumber(), "Le numero de serie est obligatoire.");
            equipmentRepository.findBySerialNumber(serialNumber).ifPresent(existing -> {
                if (!existing.getId().equals(entity.getId())) {
                    throw new ConflictException("Le numero de serie existe deja: " + serialNumber);
                }
            });
            entity.setSerialNumber(serialNumber);
        }
        if (request.categoryId() != null) {
            entity.setCategory(fetchCategory(request.categoryId()));
        }
        if (request.brand() != null) {
            entity.setBrand(normalizeOrNull(request.brand()));
        }
        if (request.model() != null) {
            entity.setModel(normalizeOrNull(request.model()));
        }
        if (request.state() != null) {
            ItEquipmentState nextState = parseState(request.state());
            assertCanTransitionToState(entity, nextState);
            entity.setState(nextState);
        }
        if (request.description() != null) {
            entity.setDescription(normalizeOrNull(request.description()));
        }

        ItEquipmentEntity saved = equipmentRepository.save(entity);
        ItEquipmentAssignmentEntity assignment = assignmentRepository.findActiveByEquipmentId(saved.getId()).orElse(null);
        return toResponse(saved, assignment, resolveEmployeeName(saved, assignment));
    }

    @Transactional
    public ItEquipmentResponse updateState(UUID id, String newState) {
        ItEquipmentEntity entity = fetchEquipment(id);
        ItEquipmentState parsedState = parseState(newState);
        assertCanTransitionToState(entity, parsedState);
        entity.setState(parsedState);

        ItEquipmentEntity saved = equipmentRepository.save(entity);
        ItEquipmentAssignmentEntity assignment = assignmentRepository.findActiveByEquipmentId(saved.getId()).orElse(null);
        return toResponse(saved, assignment, resolveEmployeeName(saved, assignment));
    }

    @Transactional
    public void archive(UUID id) {
        ItEquipmentEntity entity = fetchEquipment(id);
        if ("ASSIGNED".equalsIgnoreCase(entity.getAssignmentStatus())) {
            throw new ConflictException("Impossible d'archiver un equipement IT actuellement affecte.");
        }

        entity.setState(ItEquipmentState.ARCHIVED);
        equipmentRepository.save(entity);
    }

    @Transactional(readOnly = true)
    public List<ItEquipmentResponse> getEmployeeEquipment(String employeeId) {
        String normalizedEmployeeId = requireNonBlank(employeeId, "Identifiant employe manquant.");
        List<ItEquipmentEntity> entities = equipmentRepository.findByCurrentEmployeeId(normalizedEmployeeId);
        if (entities.isEmpty()) {
            return List.of();
        }

        Set<UUID> ids = entities.stream().map(ItEquipmentEntity::getId).collect(Collectors.toSet());
        Map<UUID, ItEquipmentAssignmentEntity> assignmentMap = assignmentRepository.findActiveByEquipmentIds(ids)
            .stream()
            .collect(Collectors.toMap(a -> a.getEquipment().getId(), a -> a, (left, right) -> left));

        return entities.stream()
            .filter(entity -> entity.getState() != ItEquipmentState.ARCHIVED)
            .map(entity -> {
                ItEquipmentAssignmentEntity assignment = assignmentMap.get(entity.getId());
                String employeeName = resolveEmployeeName(entity, assignment);
                return toResponse(entity, assignment, employeeName);
            })
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public InternalItEquipmentSummaryResponse getInternalSummary(UUID equipmentId) {
        ItEquipmentEntity entity = fetchEquipment(equipmentId);
        ItEquipmentAssignmentEntity assignment = assignmentRepository.findActiveByEquipmentId(entity.getId()).orElse(null);
        return toInternalSummary(entity, assignment, resolveEmployeeName(entity, assignment));
    }

    @Transactional(readOnly = true)
    public InternalItEquipmentOwnershipResponse checkOwnership(UUID equipmentId, String employeeId) {
        String normalizedEmployeeId = requireNonBlank(employeeId, "Identifiant employe manquant.");
        ItEquipmentEntity entity = fetchEquipment(equipmentId);
        ItEquipmentAssignmentEntity assignment = assignmentRepository.findActiveByEquipmentId(entity.getId()).orElse(null);
        boolean owner = entity.getCurrentEmployeeId() != null
            && entity.getCurrentEmployeeId().equalsIgnoreCase(normalizedEmployeeId)
            && "ASSIGNED".equalsIgnoreCase(entity.getAssignmentStatus())
            && entity.getState() != ItEquipmentState.ARCHIVED;

        return new InternalItEquipmentOwnershipResponse(
            owner,
            toInternalSummary(entity, assignment, resolveEmployeeName(entity, assignment))
        );
    }

    @Transactional
    public InternalItEquipmentSummaryResponse updateStateForInternal(UUID equipmentId, String newState) {
        ItEquipmentResponse response = updateState(equipmentId, newState);
        return new InternalItEquipmentSummaryResponse(
            response.id(),
            response.name(),
            response.serialNumber(),
            response.categoryName(),
            response.currentEmployeeId(),
            response.currentEmployeeName(),
            response.state(),
            response.assignmentStatus(),
            response.assignedAt()
        );
    }

    @Transactional
    public void assignToEmployee(UUID equipmentId, String employeeId) {
        ItEquipmentEntity entity = fetchEquipment(equipmentId);
        String normalizedEmployeeId = requireNonBlank(employeeId, "Employe obligatoire.");

        if (entity.getState() == ItEquipmentState.ARCHIVED || entity.getState() == ItEquipmentState.OUT_OF_SERVICE) {
            throw new BadRequestException("Un equipement archive ou hors service ne peut pas etre affecte.");
        }

        entity.setCurrentEmployeeId(normalizedEmployeeId);
        entity.setAssignmentStatus("ASSIGNED");
        equipmentRepository.save(entity);
    }

    @Transactional
    public void unassignFromEmployee(UUID equipmentId) {
        ItEquipmentEntity entity = fetchEquipment(equipmentId);
        entity.setCurrentEmployeeId(null);
        entity.setAssignmentStatus("NOT_ASSIGNED");
        equipmentRepository.save(entity);
    }

    private Page<ItEquipmentResponse> mapPageToResponse(Page<ItEquipmentEntity> page) {
        List<ItEquipmentEntity> equipments = page.getContent();
        if (equipments.isEmpty()) {
            return new PageImpl<>(List.of(), page.getPageable(), page.getTotalElements());
        }

        Set<UUID> equipmentIds = equipments.stream().map(ItEquipmentEntity::getId).collect(Collectors.toSet());
        Map<UUID, ItEquipmentAssignmentEntity> assignmentByEquipment = assignmentRepository.findActiveByEquipmentIds(equipmentIds)
            .stream()
            .collect(Collectors.toMap(a -> a.getEquipment().getId(), a -> a, (left, right) -> left));

        Map<String, String> employeeNames = resolveEmployeeNames(
            assignmentByEquipment.values().stream()
                .map(ItEquipmentAssignmentEntity::getEmployeeId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet())
        );

        List<ItEquipmentResponse> content = equipments.stream()
            .map(entity -> {
                ItEquipmentAssignmentEntity assignment = assignmentByEquipment.get(entity.getId());
                String employeeName = resolveEmployeeName(entity, assignment, employeeNames);
                return toResponse(entity, assignment, employeeName);
            })
            .collect(Collectors.toList());

        return new PageImpl<>(content, page.getPageable(), page.getTotalElements());
    }

    private ItEquipmentResponse toResponse(
        ItEquipmentEntity entity,
        ItEquipmentAssignmentEntity assignment,
        String employeeName
    ) {
        return new ItEquipmentResponse(
            entity.getId(),
            entity.getCategory().getId(),
            entity.getName(),
            entity.getSerialNumber(),
            entity.getCategory().getName(),
            entity.getBrand(),
            entity.getModel(),
            entity.getState().toString(),
            entity.getAssignmentStatus(),
            entity.getDescription(),
            entity.getCurrentEmployeeId(),
            employeeName,
            assignment == null ? null : assignment.getAssignedAt(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private InternalItEquipmentSummaryResponse toInternalSummary(
        ItEquipmentEntity entity,
        ItEquipmentAssignmentEntity assignment,
        String employeeName
    ) {
        return new InternalItEquipmentSummaryResponse(
            entity.getId(),
            entity.getName(),
            entity.getSerialNumber(),
            entity.getCategory().getName(),
            entity.getCurrentEmployeeId(),
            employeeName,
            entity.getState().name(),
            entity.getAssignmentStatus(),
            assignment == null ? null : assignment.getAssignedAt()
        );
    }

    private ItEquipmentEntity fetchEquipment(UUID id) {
        UUID safeId = Objects.requireNonNull(id);
        return equipmentRepository.findById(safeId)
            .orElseThrow(() -> new ResourceNotFoundException("Equipement IT introuvable: " + id));
    }

    private ItEquipmentCategoryEntity fetchCategory(UUID categoryId) {
        UUID safeId = Objects.requireNonNull(categoryId);
        return categoryRepository.findById(safeId)
            .orElseThrow(() -> new ResourceNotFoundException("Categorie introuvable: " + categoryId));
    }

    private ItEquipmentState parseState(String value) {
        String normalized = normalize(value).toUpperCase();
        if (normalized.isEmpty()) {
            throw new BadRequestException("Etat equipement IT obligatoire.");
        }
        try {
            return ItEquipmentState.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new BadRequestException("Etat equipement IT invalide: " + value);
        }
    }

    private String normalizeAssignmentStatus(String value) {
        String normalized = normalize(value).toUpperCase();
        if (!"NOT_ASSIGNED".equals(normalized) && !"ASSIGNED".equals(normalized)) {
            throw new BadRequestException("Statut d'affectation invalide: " + value);
        }
        return normalized;
    }

    private void assertCanTransitionToState(ItEquipmentEntity entity, ItEquipmentState nextState) {
        if (nextState == ItEquipmentState.ARCHIVED && "ASSIGNED".equalsIgnoreCase(entity.getAssignmentStatus())) {
            throw new ConflictException("Impossible d'archiver un equipement IT actuellement affecte.");
        }
    }

    private Map<String, String> resolveEmployeeNames(Set<String> employeeIds) {
        if (employeeIds.isEmpty()) {
            return Map.of();
        }

        Map<String, String> resolved = new HashMap<>();
        employeeIds.forEach(employeeId -> userRepository.findByUsernameIgnoreCase(employeeId)
            .or(() -> userRepository.findByEmailIgnoreCase(employeeId))
            .ifPresent(user -> resolved.put(employeeId, toFullName(user))));
        return resolved;
    }

    private String resolveEmployeeName(
        ItEquipmentEntity entity,
        ItEquipmentAssignmentEntity assignment,
        Map<String, String> employeeNames
    ) {
        if (assignment != null && assignment.getEmployeeName() != null && !assignment.getEmployeeName().isBlank()) {
            return assignment.getEmployeeName();
        }

        String employeeId = entity.getCurrentEmployeeId();
        if (employeeId == null || employeeId.isBlank()) {
            return null;
        }

        return employeeNames.getOrDefault(employeeId, employeeId);
    }

    private String resolveEmployeeName(ItEquipmentEntity entity, ItEquipmentAssignmentEntity assignment) {
        String currentEmployeeId = entity.getCurrentEmployeeId();
        if (currentEmployeeId == null || currentEmployeeId.isBlank()) {
            return resolveEmployeeName(entity, assignment, Map.of());
        }
        return resolveEmployeeName(entity, assignment, resolveEmployeeNames(Set.of(currentEmployeeId)));
    }

    private String toFullName(UserEntity user) {
        String firstName = normalize(user.getFirstName());
        String lastName = normalize(user.getLastName());
        String fullName = (firstName + " " + lastName).trim();
        return fullName.isEmpty() ? normalize(user.getUsername()) : fullName;
    }

    private String requireNonBlank(String value, String message) {
        String normalized = normalize(value);
        if (normalized.isEmpty()) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private String normalizeOrNull(String value) {
        String normalized = normalize(value);
        return normalized.isEmpty() ? null : normalized;
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }
}
