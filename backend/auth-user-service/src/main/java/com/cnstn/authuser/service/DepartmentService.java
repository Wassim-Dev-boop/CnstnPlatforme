package com.cnstn.authuser.service;

import com.cnstn.authuser.dto.DepartmentCreateRequest;
import com.cnstn.authuser.dto.DepartmentResponse;
import com.cnstn.authuser.dto.DepartmentUpdateRequest;
import com.cnstn.authuser.dto.PageResponse;
import com.cnstn.authuser.entity.DepartmentEntity;
import com.cnstn.authuser.exception.ConflictException;
import com.cnstn.authuser.exception.ResourceNotFoundException;
import com.cnstn.authuser.mapper.DepartmentMapper;
import com.cnstn.authuser.mapper.PageMapper;
import com.cnstn.authuser.repository.DepartmentRepository;
import com.cnstn.authuser.repository.UserRepository;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DepartmentService {

    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;

    public DepartmentService(DepartmentRepository departmentRepository, UserRepository userRepository) {
        this.departmentRepository = departmentRepository;
        this.userRepository = userRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<DepartmentResponse> list(Pageable pageable, String search, Boolean active) {
        Specification<DepartmentEntity> specification = buildListSpecification(search, active);
        Page<DepartmentEntity> page = departmentRepository.findAll(specification, Objects.requireNonNull(pageable));
        return PageMapper.fromPage(page, page.map(DepartmentMapper::toResponse).getContent());
    }

    @Transactional(readOnly = true)
    public List<DepartmentResponse> listActiveForPublic() {
        return departmentRepository.findByActiveTrueOrderByNameAsc()
                .stream()
                .map(DepartmentMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DepartmentResponse getById(UUID id) {
        return DepartmentMapper.toResponse(fetchDepartment(Objects.requireNonNull(id)));
    }

    @Transactional
    public DepartmentResponse create(DepartmentCreateRequest request) {
        if (departmentRepository.existsByCodeIgnoreCase(request.code())) {
            throw new ConflictException("Department code already exists: " + request.code());
        }

        DepartmentEntity entity = new DepartmentEntity();
        entity.setCode(request.code().trim().toUpperCase());
        entity.setName(request.name().trim());
        entity.setDescription(request.description());
        entity.setActive(request.active() == null || request.active());

        return DepartmentMapper.toResponse(departmentRepository.save(entity));
    }

    @Transactional
    public DepartmentResponse update(UUID id, DepartmentUpdateRequest request) {
        DepartmentEntity entity = fetchDepartment(Objects.requireNonNull(id));
        entity.setName(request.name().trim());
        entity.setDescription(request.description());
        if (request.active() != null) {
            entity.setActive(request.active());
        }
        return DepartmentMapper.toResponse(departmentRepository.save(entity));
    }

    @Transactional
    public void delete(UUID id) {
        UUID safeId = Objects.requireNonNull(id);
        DepartmentEntity entity = Objects.requireNonNull(fetchDepartment(safeId));
        long usersInDepartment = userRepository.countByDepartment_Id(safeId);

        if (usersInDepartment > 0) {
            throw new ConflictException("Department is assigned to users and cannot be deleted");
        }

        departmentRepository.delete(entity);
    }

    @Transactional(readOnly = true)
    public DepartmentEntity fetchDepartment(UUID id) {
        UUID safeId = Objects.requireNonNull(id);
        return departmentRepository.findById(safeId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found: " + id));
    }

    private Specification<DepartmentEntity> buildListSpecification(String search, Boolean active) {
        Specification<DepartmentEntity> specification = (root, query, cb) -> cb.conjunction();
        String normalizedSearch = normalizeOrNull(search);

        if (normalizedSearch != null) {
            specification = specification.and((root, query, cb) -> {
                String pattern = "%" + normalizedSearch.toLowerCase() + "%";
                return cb.or(
                        cb.like(cb.lower(root.get("code")), pattern),
                        cb.like(cb.lower(root.get("name")), pattern),
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
}
