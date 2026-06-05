package com.cnstn.authuser.controller;

import com.cnstn.authuser.dto.ProfileUpdateRequest;
import com.cnstn.authuser.dto.MyPermissionsResponse;
import com.cnstn.authuser.dto.UserResponse;
import com.cnstn.authuser.service.ProfileService;
import com.cnstn.authuser.service.UserPermissionService;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
public class ProfileController {

    private final ProfileService profileService;
    private final UserPermissionService userPermissionService;

    public ProfileController(ProfileService profileService, UserPermissionService userPermissionService) {
        this.profileService = profileService;
        this.userPermissionService = userPermissionService;
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','RESPONSABLE_SECURITE','RESPONSABLE_IT','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public UserResponse me(Authentication authentication) {
        return profileService.getCurrentUser(authentication.getName());
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','RESPONSABLE_SECURITE','RESPONSABLE_IT','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public MyPermissionsResponse myPermissions(Authentication authentication) {
        return userPermissionService.getCurrentUserPermissions(authentication.getName());
    }

    @PatchMapping("/profile")
    @PreAuthorize("hasAnyRole('ADMIN','EMPLOYE','CHEF_HIERARCHIQUE','RESPONSABLE_SALLE','RESPONSABLE_SECURITE','RESPONSABLE_IT','DIRECTEUR_DSN','RESPONSABLE_QUALITE')")
    public UserResponse updateProfile(Authentication authentication, @Valid @RequestBody ProfileUpdateRequest request) {
        return profileService.updateCurrentUser(authentication.getName(), request);
    }
}
