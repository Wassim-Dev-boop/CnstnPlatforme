package com.cnstn.authuser.service;

import com.cnstn.authuser.dto.ItAssignableEmployeeResponse;
import com.cnstn.authuser.dto.ItEquipmentAssignmentCreateRequest;
import com.cnstn.authuser.dto.ItEquipmentAssignmentResponse;
import com.cnstn.authuser.entity.ItEquipmentAssignmentEntity;
import com.cnstn.authuser.entity.ItEquipmentEntity;
import com.cnstn.authuser.entity.ItEquipmentState;
import com.cnstn.authuser.entity.UserEntity;
import com.cnstn.authuser.exception.BadRequestException;
import com.cnstn.authuser.exception.ConflictException;
import com.cnstn.authuser.exception.ResourceNotFoundException;
import com.cnstn.authuser.repository.ItEquipmentAssignmentRepository;
import com.cnstn.authuser.repository.ItEquipmentRepository;
import com.cnstn.authuser.repository.UserRepository;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ItEquipmentAssignmentService {

    private final ItEquipmentAssignmentRepository assignmentRepository;
    private final ItEquipmentRepository equipmentRepository;
    private final ItEquipmentService equipmentService;
    private final UserRepository userRepository;

    public ItEquipmentAssignmentService(
        ItEquipmentAssignmentRepository assignmentRepository,
        ItEquipmentRepository equipmentRepository,
        ItEquipmentService equipmentService,
        UserRepository userRepository
    ) {
        this.assignmentRepository = assignmentRepository;
        this.equipmentRepository = equipmentRepository;
        this.equipmentService = equipmentService;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public Page<ItEquipmentAssignmentResponse> listAllActive(Pageable pageable) {
        return assignmentRepository.findAllActive(pageable).map(this::toResponse);
    }

    @Transactional(readOnly = true)
    public List<ItEquipmentAssignmentResponse> listHistoryByEquipment(UUID equipmentId) {
        return assignmentRepository.findByEquipmentIdOrderByAssignedAtDesc(Objects.requireNonNull(equipmentId))
            .stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<ItEquipmentAssignmentResponse> getEmployeeAssignments(String employeeId) {
        String normalizedEmployeeId = requireNonBlank(employeeId, "Identifiant employe manquant.");
        return assignmentRepository.findActiveByEmployeeId(normalizedEmployeeId)
            .stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ItEquipmentAssignmentResponse getById(UUID id) {
        return toResponse(fetchAssignment(id));
    }

    @Transactional(readOnly = true)
    public boolean hasEmployeeAccessToAssignment(UUID id, String employeeId) {
        ItEquipmentAssignmentEntity assignment = fetchAssignment(id);
        String normalizedEmployeeId = normalize(employeeId);
        return normalizedEmployeeId.equalsIgnoreCase(normalize(assignment.getEmployeeId()));
    }

    @Transactional
    public ItEquipmentAssignmentResponse assign(ItEquipmentAssignmentCreateRequest request, String assignedBy) {
        ItEquipmentEntity equipment = fetchEquipment(request.equipmentId());
        if (equipment.getState() == ItEquipmentState.ARCHIVED || equipment.getState() == ItEquipmentState.OUT_OF_SERVICE) {
            throw new BadRequestException("Un equipement archive ou hors service ne peut pas etre affecte.");
        }

        if ("ASSIGNED".equalsIgnoreCase(equipment.getAssignmentStatus())) {
            throw new ConflictException("Cet equipement IT est deja affecte.");
        }

        if (assignmentRepository.findActiveByEquipmentId(request.equipmentId()).isPresent()) {
            throw new ConflictException("Cet equipement IT possede deja une affectation active.");
        }

        UserEntity employee = fetchEmployee(request.employeeId());
        String employeeUsername = normalize(employee.getUsername());
        String employeeFullName = toFullName(employee);

        ItEquipmentAssignmentEntity entity = new ItEquipmentAssignmentEntity(
            equipment,
            employeeUsername,
            employeeFullName,
            normalize(assignedBy)
        );
        ItEquipmentAssignmentEntity saved = assignmentRepository.save(entity);

        equipmentService.assignToEmployee(equipment.getId(), employeeUsername);
        return toResponse(saved);
    }

    @Transactional
    public ItEquipmentAssignmentResponse returnEquipment(UUID assignmentId, String returnedBy) {
        ItEquipmentAssignmentEntity entity = fetchAssignment(assignmentId);
        if ("RETURNED".equalsIgnoreCase(entity.getStatus()) || entity.getReturnedAt() != null) {
            throw new ConflictException("Cette affectation est deja terminee.");
        }

        entity.setReturnedAt(Instant.now());
        entity.setStatus("RETURNED");
        entity.setAssignedBy(normalizeOrNull(returnedBy));
        ItEquipmentAssignmentEntity saved = assignmentRepository.save(entity);

        equipmentService.unassignFromEmployee(entity.getEquipment().getId());
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<ItAssignableEmployeeResponse> listAssignableEmployees() {
        return userRepository.findByEnabledTrueOrderByFirstNameAscLastNameAsc()
            .stream()
            .filter(user -> !normalize(user.getUsername()).isEmpty())
            .sorted(Comparator.comparing(UserEntity::getFirstName, String.CASE_INSENSITIVE_ORDER))
            .map(user -> new ItAssignableEmployeeResponse(
                user.getUsername(),
                toFullName(user),
                user.getEmail(),
                user.getDepartment() == null ? null : user.getDepartment().getName()
            ))
            .collect(Collectors.toList());
    }

    private ItEquipmentAssignmentEntity fetchAssignment(UUID assignmentId) {
        UUID safeId = Objects.requireNonNull(assignmentId);
        return assignmentRepository.findById(safeId)
            .orElseThrow(() -> new ResourceNotFoundException("Affectation introuvable: " + assignmentId));
    }

    private ItEquipmentEntity fetchEquipment(UUID equipmentId) {
        UUID safeId = Objects.requireNonNull(equipmentId);
        return equipmentRepository.findById(safeId)
            .orElseThrow(() -> new ResourceNotFoundException("Equipement IT introuvable: " + equipmentId));
    }

    private UserEntity fetchEmployee(String employeeIdentifier) {
        String normalized = requireNonBlank(employeeIdentifier, "Employe obligatoire.");
        UserEntity user = userRepository.findByUsernameIgnoreCase(normalized)
            .or(() -> userRepository.findByEmailIgnoreCase(normalized))
            .orElseThrow(() -> new ResourceNotFoundException("Employe introuvable: " + normalized));

        if (!user.isEnabled()) {
            throw new BadRequestException("L'employe selectionne est desactive.");
        }
        return user;
    }

    private ItEquipmentAssignmentResponse toResponse(ItEquipmentAssignmentEntity entity) {
        return new ItEquipmentAssignmentResponse(
            entity.getId(),
            entity.getEquipment().getId(),
            entity.getEquipment().getName(),
            entity.getEquipment().getSerialNumber(),
            entity.getEquipment().getCategory().getName(),
            entity.getEmployeeId(),
            entity.getEmployeeName(),
            entity.getStatus(),
            entity.getAssignedAt(),
            entity.getReturnedAt(),
            entity.getAssignedBy(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
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
