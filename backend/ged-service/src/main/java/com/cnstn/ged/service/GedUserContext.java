package com.cnstn.ged.service;

import java.util.Set;

public record GedUserContext(
        String username,
        Set<String> roles,
        String serviceName
) {
}
