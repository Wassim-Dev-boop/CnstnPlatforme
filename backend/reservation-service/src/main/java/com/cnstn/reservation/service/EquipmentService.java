package com.cnstn.reservation.service;

import com.cnstn.reservation.dto.EquipmentRequest;
import com.cnstn.reservation.dto.EquipmentResponse;
import com.cnstn.reservation.dto.PageResponse;
import com.cnstn.reservation.entity.EquipmentEntity;
import com.cnstn.reservation.entity.EquipmentOperationalStatus;
import com.cnstn.reservation.exception.BadRequestException;
import com.cnstn.reservation.exception.ResourceNotFoundException;
import com.cnstn.reservation.mapper.ReservationMapper;
import com.cnstn.reservation.repository.EquipmentRepository;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class EquipmentService {

    private final EquipmentRepository equipmentRepository;

    public EquipmentService(EquipmentRepository equipmentRepository) {
        this.equipmentRepository = equipmentRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<EquipmentResponse> list(
            Pageable pageable,
            String search,
            Boolean active
    ) {
        Specification<EquipmentEntity> specification = buildListSpecification(search, active);
        Page<EquipmentEntity> page = equipmentRepository.findAll(specification, Objects.requireNonNull(pageable));
        return new PageResponse<>(
                page.map(ReservationMapper::toResponse).getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public EquipmentResponse getById(UUID id) {
        return ReservationMapper.toResponse(fetchEquipment(Objects.requireNonNull(id)));
    }

    @Transactional
    public EquipmentResponse create(EquipmentRequest request) {
        validateQuantities(request.totalQuantity(), request.availableQuantity());
        EquipmentEntity equipment = new EquipmentEntity();
        equipment.setName(request.name().trim());
        equipment.setSerialNumber(request.serialNumber().trim());
        equipment.setDescription(normalizeOrNull(request.description()));
        equipment.setType(request.type().trim());
        equipment.setLocation(normalizeOrNull(request.location()));
        equipment.setTotalQuantity(request.totalQuantity());
        equipment.setAvailableQuantity(request.availableQuantity());
        EquipmentOperationalStatus status = request.status() == null
                ? EquipmentOperationalStatus.DISPONIBLE
                : request.status();
        equipment.setStatus(status);
        equipment.setActive(resolveActive(status, request.active()));
        if (!equipment.isActive()) {
            equipment.setStatus(EquipmentOperationalStatus.INACTIVE);
        }

        return ReservationMapper.toResponse(equipmentRepository.save(equipment));
    }

    @Transactional
    public EquipmentResponse update(UUID id, EquipmentRequest request) {
        validateQuantities(request.totalQuantity(), request.availableQuantity());
        EquipmentEntity equipment = fetchEquipment(Objects.requireNonNull(id));
        equipment.setName(request.name().trim());
        equipment.setSerialNumber(request.serialNumber().trim());
        equipment.setDescription(normalizeOrNull(request.description()));
        equipment.setType(request.type().trim());
        equipment.setLocation(normalizeOrNull(request.location()));
        equipment.setTotalQuantity(request.totalQuantity());
        equipment.setAvailableQuantity(request.availableQuantity());
        EquipmentOperationalStatus status = request.status() == null ? equipment.getStatus() : request.status();
        equipment.setStatus(status);
        equipment.setActive(resolveActive(status, request.active()));
        if (!equipment.isActive()) {
            equipment.setStatus(EquipmentOperationalStatus.INACTIVE);
        }

        return ReservationMapper.toResponse(equipmentRepository.save(equipment));
    }

    @Transactional
    public void delete(UUID id) {
        EquipmentEntity equipment = fetchEquipment(Objects.requireNonNull(id));
        equipment.setActive(false);
        equipment.setStatus(EquipmentOperationalStatus.INACTIVE);
        equipmentRepository.save(equipment);
    }

    @Transactional(readOnly = true)
    public EquipmentEntity fetchEquipment(UUID id) {
        UUID safeId = Objects.requireNonNull(id);
        return equipmentRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Equipment not found: " + id));
    }

    private Specification<EquipmentEntity> buildListSpecification(String search, Boolean active) {
        Specification<EquipmentEntity> specification = (root, query, cb) -> cb.conjunction();
        String normalizedSearch = normalizeOrNull(search);

        if (normalizedSearch != null) {
            specification = specification.and((root, query, cb) -> {
                String pattern = "%" + normalizedSearch.toLowerCase() + "%";
                return cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("serialNumber")), pattern),
                        cb.like(cb.lower(root.get("description")), pattern)
                );
            });
        }

        if (active != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("active"), active));
        }

        return specification;
    }

    private String normalizeOrNull(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    private void validateQuantities(Integer totalQuantity, Integer availableQuantity) {
        if (totalQuantity == null || totalQuantity < 1) {
            throw new BadRequestException("La quantite totale doit etre superieure a zero");
        }
        if (availableQuantity == null || availableQuantity < 0) {
            throw new BadRequestException("La quantite disponible ne peut pas etre negative");
        }
        if (availableQuantity > totalQuantity) {
            throw new BadRequestException("La quantite disponible ne peut pas depasser la quantite totale");
        }
    }

    private boolean resolveActive(EquipmentOperationalStatus status, Boolean requestedActive) {
        if (status == EquipmentOperationalStatus.INACTIVE) {
            return false;
        }
        return requestedActive == null || requestedActive;
    }
}
