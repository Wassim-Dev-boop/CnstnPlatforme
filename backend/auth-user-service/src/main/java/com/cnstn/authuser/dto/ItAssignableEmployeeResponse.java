package com.cnstn.authuser.dto;

public record ItAssignableEmployeeResponse(
    String username,
    String fullName,
    String email,
    String departmentName
) {
}
