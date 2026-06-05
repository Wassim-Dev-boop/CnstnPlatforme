package com.cnstn.authuser.service;

import com.cnstn.authuser.entity.RoleName;
import java.util.Collections;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

public final class UserPermissionPolicy {

    public static final String VIEW_USERS_MODULE = "VIEW_USERS_MODULE";
    public static final String VIEW_EVENTS_MODULE = "VIEW_EVENTS_MODULE";
    public static final String VIEW_GED_MODULE = "VIEW_GED_MODULE";
    public static final String VIEW_INTERVENTIONS_MODULE = "VIEW_INTERVENTIONS_MODULE";
    public static final String CREATE_USER = "CREATE_USER";
    public static final String UPDATE_USER = "UPDATE_USER";
    public static final String CREATE_EVENT = "CREATE_EVENT";
    public static final String VALIDATE_EVENT = "VALIDATE_EVENT";
    public static final String PUBLISH_DOCUMENT = "PUBLISH_DOCUMENT";
    public static final String CHANGE_INTERVENTION_STATUS = "CHANGE_INTERVENTION_STATUS";

    public static final Set<String> ALL_CODES = Collections.unmodifiableSet(new HashSet<>(Set.of(
            VIEW_USERS_MODULE,
            VIEW_EVENTS_MODULE,
            VIEW_GED_MODULE,
            VIEW_INTERVENTIONS_MODULE,
            CREATE_USER,
            UPDATE_USER,
            CREATE_EVENT,
            VALIDATE_EVENT,
            PUBLISH_DOCUMENT,
            CHANGE_INTERVENTION_STATUS
    )));

    private static final Map<RoleName, Set<String>> ROLE_DEFAULTS;

    static {
        Map<RoleName, Set<String>> defaults = new EnumMap<>(RoleName.class);
        defaults.put(RoleName.ADMIN, new HashSet<>(ALL_CODES));

        defaults.put(RoleName.EMPLOYE, Set.of(
                VIEW_EVENTS_MODULE,
                VIEW_GED_MODULE,
                VIEW_INTERVENTIONS_MODULE,
                CREATE_EVENT
        ));

        defaults.put(RoleName.CHEF_HIERARCHIQUE, Set.of(
                VIEW_EVENTS_MODULE,
                VIEW_GED_MODULE,
                VIEW_INTERVENTIONS_MODULE,
                CREATE_EVENT,
                VALIDATE_EVENT
        ));

        defaults.put(RoleName.RESPONSABLE_SALLE, Set.of(
                VIEW_EVENTS_MODULE,
                VIEW_GED_MODULE,
                VIEW_INTERVENTIONS_MODULE,
                CHANGE_INTERVENTION_STATUS
        ));

        defaults.put(RoleName.RESPONSABLE_SECURITE, Set.of(
                VIEW_EVENTS_MODULE,
                VIEW_GED_MODULE
        ));

        defaults.put(RoleName.RESPONSABLE_IT, Set.of(
                VIEW_INTERVENTIONS_MODULE
        ));

        defaults.put(RoleName.DIRECTEUR_DSN, Set.of(
                VIEW_EVENTS_MODULE,
                VIEW_GED_MODULE,
                VIEW_INTERVENTIONS_MODULE,
                VALIDATE_EVENT
        ));

        defaults.put(RoleName.RESPONSABLE_QUALITE, Set.of(
                VIEW_EVENTS_MODULE,
                VIEW_GED_MODULE,
                CREATE_EVENT,
                PUBLISH_DOCUMENT
        ));

        ROLE_DEFAULTS = Collections.unmodifiableMap(defaults);
    }

    private UserPermissionPolicy() {
    }

    public static Set<String> resolveForRoles(Set<RoleName> roles) {
        Set<String> resolved = new HashSet<>();
        if (roles == null || roles.isEmpty()) {
            return resolved;
        }

        roles.stream()
                .filter(Objects::nonNull)
                .map(ROLE_DEFAULTS::get)
                .filter(Objects::nonNull)
                .forEach(resolved::addAll);

        if (roles.contains(RoleName.RESPONSABLE_QUALITE)) {
            Set<String> employeeDefaults = ROLE_DEFAULTS.get(RoleName.EMPLOYE);
            if (employeeDefaults != null) {
                resolved.addAll(employeeDefaults);
            }
        }

        return resolved;
    }

    public static Set<RoleName> normalizeRoles(Set<RoleName> roles) {
        Set<RoleName> normalized = new HashSet<>();
        if (roles != null) {
            normalized.addAll(roles);
        }

        if (normalized.contains(RoleName.RESPONSABLE_QUALITE)) {
            normalized.add(RoleName.EMPLOYE);
        }

        return normalized;
    }

    public static Set<String> normalizePermissionCodes(Set<String> permissionCodes) {
        Set<String> normalized = new HashSet<>();
        if (permissionCodes == null || permissionCodes.isEmpty()) {
            return normalized;
        }

        permissionCodes.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(code -> !code.isEmpty())
                .forEach(normalized::add);

        return normalized;
    }

    public static Set<String> unknownCodes(Set<String> permissionCodes) {
        Set<String> unknown = new HashSet<>(normalizePermissionCodes(permissionCodes));
        unknown.removeAll(ALL_CODES);
        return unknown;
    }

    public static Set<String> allCodes() {
        return new HashSet<>(ALL_CODES);
    }

    public static Set<RoleName> parseRoles(Set<String> rawRoles) {
        if (rawRoles == null || rawRoles.isEmpty()) {
            return Collections.emptySet();
        }

        Set<RoleName> parsed = new HashSet<>();
        rawRoles.stream()
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(value -> !value.isEmpty())
                .forEach(value -> {
                    try {
                        parsed.add(RoleName.valueOf(value));
                    } catch (IllegalArgumentException ignored) {
                        // Ignore unmapped roles from token payload.
                    }
                });
        return parsed;
    }
}
