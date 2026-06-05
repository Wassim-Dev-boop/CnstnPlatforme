package com.cnstn.authuser.controller;

import com.cnstn.authuser.dto.DepartmentResponse;
import com.cnstn.authuser.service.DepartmentService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/departments")
public class PublicDepartmentController {

    private final DepartmentService departmentService;

    public PublicDepartmentController(DepartmentService departmentService) {
        this.departmentService = departmentService;
    }

    @GetMapping
    public List<DepartmentResponse> listActiveDepartments() {
        return departmentService.listActiveForPublic();
    }
}
