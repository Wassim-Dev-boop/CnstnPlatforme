package com.cnstn.authuser.service;

import com.cnstn.authuser.dto.ItEquipmentCategoryResponse;
import com.cnstn.authuser.entity.ItEquipmentCategoryEntity;
import com.cnstn.authuser.exception.BadRequestException;
import com.cnstn.authuser.exception.ConflictException;
import com.cnstn.authuser.exception.ResourceNotFoundException;
import com.cnstn.authuser.repository.ItEquipmentCategoryRepository;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ItEquipmentCategoryService {

    private final ItEquipmentCategoryRepository categoryRepository;

    public ItEquipmentCategoryService(ItEquipmentCategoryRepository categoryRepository) {
        this.categoryRepository = categoryRepository;
    }

    @Transactional(readOnly = true)
    public List<ItEquipmentCategoryResponse> listActive() {
        return categoryRepository.findByActiveTrue()
            .stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public ItEquipmentCategoryResponse getById(UUID id) {
        return categoryRepository.findById(id)
            .map(this::toResponse)
            .orElseThrow(() -> new ResourceNotFoundException("Categorie introuvable: " + id));
    }

    @Transactional
    public ItEquipmentCategoryResponse create(String name, String description) {
        String normalizedName = normalize(name);
        if (normalizedName.isEmpty()) {
            throw new BadRequestException("Le nom de la categorie est obligatoire.");
        }

        if (categoryRepository.existsByName(normalizedName)) {
            throw new ConflictException("Une categorie IT existe deja avec ce nom: " + normalizedName);
        }

        ItEquipmentCategoryEntity entity = new ItEquipmentCategoryEntity(normalizedName, normalizeOrNull(description));
        ItEquipmentCategoryEntity saved = categoryRepository.save(entity);
        return toResponse(saved);
    }

    @Transactional
    public ItEquipmentCategoryResponse update(UUID id, String name, String description) {
        ItEquipmentCategoryEntity entity = categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Categorie introuvable: " + id));

        String normalizedName = name == null ? null : normalize(name);
        if (normalizedName != null && normalizedName.isEmpty()) {
            throw new BadRequestException("Le nom de la categorie est obligatoire.");
        }

        if (normalizedName != null
            && !normalizedName.equals(entity.getName())
            && categoryRepository.existsByName(normalizedName)) {
            throw new ConflictException("Une categorie IT existe deja avec ce nom: " + normalizedName);
        }

        if (normalizedName != null) {
            entity.setName(normalizedName);
        }
        if (description != null) {
            entity.setDescription(normalizeOrNull(description));
        }

        ItEquipmentCategoryEntity saved = categoryRepository.save(entity);
        return toResponse(saved);
    }

    private ItEquipmentCategoryResponse toResponse(ItEquipmentCategoryEntity entity) {
        return new ItEquipmentCategoryResponse(
            entity.getId(),
            entity.getName(),
            entity.getDescription(),
            entity.getActive(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private String normalizeOrNull(String value) {
        String normalized = normalize(value);
        return normalized.isEmpty() ? null : normalized;
    }
}
