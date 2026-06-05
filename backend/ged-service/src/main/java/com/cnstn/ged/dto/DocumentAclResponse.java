package com.cnstn.ged.dto;

import java.util.List;

public record DocumentAclResponse(
        List<String> roles,
        List<String> services
) {
}
