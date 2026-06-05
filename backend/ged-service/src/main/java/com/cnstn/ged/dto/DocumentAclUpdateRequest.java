package com.cnstn.ged.dto;

import java.util.List;

public record DocumentAclUpdateRequest(
        List<String> roles,
        List<String> services
) {
}
