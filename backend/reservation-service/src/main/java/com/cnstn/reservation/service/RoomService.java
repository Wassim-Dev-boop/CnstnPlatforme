package com.cnstn.reservation.service;

import com.cnstn.reservation.dto.PageResponse;
import com.cnstn.reservation.dto.RoomRequest;
import com.cnstn.reservation.dto.RoomResponse;
import com.cnstn.reservation.entity.RoomEntity;
import com.cnstn.reservation.entity.RoomOperationalStatus;
import com.cnstn.reservation.exception.ResourceNotFoundException;
import com.cnstn.reservation.mapper.ReservationMapper;
import com.cnstn.reservation.repository.RoomRepository;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class RoomService {

    private final RoomRepository roomRepository;

    public RoomService(RoomRepository roomRepository) {
        this.roomRepository = roomRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<RoomResponse> list(
            Pageable pageable,
            String search,
            Boolean active,
            Integer minCapacity
    ) {
        Specification<RoomEntity> specification = buildListSpecification(search, active, minCapacity);
        Page<RoomEntity> page = roomRepository.findAll(specification, Objects.requireNonNull(pageable));
        return new PageResponse<>(
                page.map(ReservationMapper::toResponse).getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages()
        );
    }

    @Transactional(readOnly = true)
    public RoomResponse getById(UUID id) {
        return ReservationMapper.toResponse(fetchRoom(Objects.requireNonNull(id)));
    }

    @Transactional
    public RoomResponse create(RoomRequest request) {
        RoomEntity room = new RoomEntity();
        room.setName(request.name().trim());
        room.setLocation(request.location().trim());
        room.setDescription(normalizeOrNull(request.description()));
        room.setImageUrl(normalizeOrNull(request.imageUrl()));
        room.setCapacity(request.capacity());
        RoomOperationalStatus status = request.status() == null ? RoomOperationalStatus.DISPONIBLE : request.status();
        room.setStatus(status);
        room.setActive(resolveActive(status, request.active()));
        if (!room.isActive()) {
            room.setStatus(RoomOperationalStatus.INACTIVE);
        }

        return ReservationMapper.toResponse(roomRepository.save(room));
    }

    @Transactional
    public RoomResponse update(UUID id, RoomRequest request) {
        RoomEntity room = fetchRoom(Objects.requireNonNull(id));
        room.setName(request.name().trim());
        room.setLocation(request.location().trim());
        room.setDescription(normalizeOrNull(request.description()));
        room.setImageUrl(normalizeOrNull(request.imageUrl()));
        room.setCapacity(request.capacity());
        RoomOperationalStatus status = request.status() == null ? room.getStatus() : request.status();
        room.setStatus(status);
        room.setActive(resolveActive(status, request.active()));
        if (!room.isActive()) {
            room.setStatus(RoomOperationalStatus.INACTIVE);
        }

        return ReservationMapper.toResponse(roomRepository.save(room));
    }

    @Transactional
    public void delete(UUID id) {
        RoomEntity room = fetchRoom(Objects.requireNonNull(id));
        room.setActive(false);
        room.setStatus(RoomOperationalStatus.INACTIVE);
        roomRepository.save(room);
    }

    @Transactional(readOnly = true)
    public RoomEntity fetchRoom(UUID id) {
        UUID safeId = Objects.requireNonNull(id);
        return roomRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found: " + id));
    }

    private Specification<RoomEntity> buildListSpecification(String search, Boolean active, Integer minCapacity) {
        Specification<RoomEntity> specification = (root, query, cb) -> cb.conjunction();
        String normalizedSearch = normalizeOrNull(search);

        if (normalizedSearch != null) {
            specification = specification.and((root, query, cb) -> {
                String pattern = "%" + normalizedSearch.toLowerCase() + "%";
                return cb.or(
                        cb.like(cb.lower(root.get("name")), pattern),
                        cb.like(cb.lower(root.get("location")), pattern)
                );
            });
        }

        if (active != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("active"), active));
        }

        if (minCapacity != null) {
            specification = specification.and((root, query, cb) -> cb.ge(root.get("capacity"), minCapacity));
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

    private boolean resolveActive(RoomOperationalStatus status, Boolean requestedActive) {
        if (status == RoomOperationalStatus.INACTIVE) {
            return false;
        }
        return requestedActive == null || requestedActive;
    }
}
