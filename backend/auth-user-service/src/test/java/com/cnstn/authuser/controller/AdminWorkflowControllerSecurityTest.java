package com.cnstn.authuser.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anySet;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.cnstn.authuser.dto.WorkflowDetailResponse;
import com.cnstn.authuser.entity.WorkflowType;
import com.cnstn.authuser.security.JwtAuthConverter;
import com.cnstn.authuser.security.SecurityConfig;
import com.cnstn.authuser.service.AdminWorkflowService;
import com.cnstn.authuser.service.UserPermissionService;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = AdminWorkflowController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import(SecurityConfig.class)
class AdminWorkflowControllerSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private AdminWorkflowService adminWorkflowService;

    @MockBean
    private UserPermissionService userPermissionService;

    @MockBean
    private JwtAuthConverter jwtAuthConverter;

    @ParameterizedTest
    @ValueSource(strings = {
            "ROLE_EMPLOYE",
            "ROLE_RESPONSABLE_QUALITE",
            "ROLE_RESPONSABLE_SALLE",
            "ROLE_RESPONSABLE_SECURITE",
            "ROLE_DIRECTEUR_DSN",
            "ROLE_DIRECTEUR_DSN"
    })
    void nonAdminRolesAreForbidden(String role) throws Exception {
        mockMvc.perform(get("/api/v1/admin/workflows")
                        .with(jwt().authorities(new SimpleGrantedAuthority(role))))
                .andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "/api/v1/admin/workflows",
            "/api/v1/admin/workflows/audit"
    })
    void adminCanReadWorkflowEndpoints(String path) throws Exception {
        when(userPermissionService.hasPermission(any(), any(), anySet())).thenReturn(true);

        mockMvc.perform(get(path)
                        .with(jwt().jwt(jwt -> jwt.claim("preferred_username", "admin.cnstn"))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "ROLE_EMPLOYE",
            "ROLE_RESPONSABLE_QUALITE",
            "ROLE_RESPONSABLE_SALLE",
            "ROLE_RESPONSABLE_SECURITE",
            "ROLE_DIRECTEUR_DSN",
            "ROLE_DIRECTEUR_DSN"
    })
    void nonAdminCannotUpdateWorkflowStep(String role) throws Exception {
        String payload = """
                {
                  "stepLabel":"Validation sécurité",
                  "responsibleRole":"RESPONSABLE_SECURITE",
                  "required":true,
                  "refusalReasonRequired":true,
                  "active":true,
                  "conditionType":"TOUJOURS",
                  "allowedActions":["VALIDATE","REJECT"]
                }
                """;

        mockMvc.perform(put("/api/v1/admin/workflows/{workflowId}/steps/{stepId}",
                                UUID.randomUUID(), UUID.randomUUID())
                        .with(jwt().authorities(new SimpleGrantedAuthority(role)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "ROLE_EMPLOYE",
            "ROLE_RESPONSABLE_QUALITE",
            "ROLE_RESPONSABLE_SALLE",
            "ROLE_RESPONSABLE_SECURITE",
            "ROLE_DIRECTEUR_DSN",
            "ROLE_DIRECTEUR_DSN"
    })
    void nonAdminCannotAddWorkflowStep(String role) throws Exception {
        String payload = """
                {
                  "stepCode":"EVENT_POST_EVENT_REPORT",
                  "stepLabel":"Compte rendu post-événement",
                  "responsibleRole":"RESPONSABLE_QUALITE",
                  "required":false,
                  "refusalReasonRequired":false,
                  "active":true,
                  "conditionType":"DOCUMENT_CONFIDENTIEL",
                  "allowedActions":["ARCHIVE"]
                }
                """;

        mockMvc.perform(post("/api/v1/admin/workflows/{workflowId}/steps", UUID.randomUUID())
                        .with(jwt().authorities(new SimpleGrantedAuthority(role)))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isForbidden());
    }

    @ParameterizedTest
    @ValueSource(strings = {"true", "false"})
    void adminCanUpdateWorkflowGeneralInfo(String activeState) throws Exception {
        when(userPermissionService.hasPermission(any(), any(), anySet())).thenReturn(true);
        when(adminWorkflowService.updateWorkflowGeneral(any(), any(), any())).thenReturn(sampleDetail());

        String payload = """
                {
                  "workflowLabel":"Workflow événement",
                  "description":"Mise à jour",
                  "active": %s
                }
                """.formatted(activeState);

        mockMvc.perform(put("/api/v1/admin/workflows/{workflowId}", UUID.randomUUID())
                        .with(jwt().jwt(jwt -> jwt.claim("preferred_username", "admin.cnstn"))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"true"})
    void adminCanAddWorkflowStep(String ignored) throws Exception {
        when(userPermissionService.hasPermission(any(), any(), anySet())).thenReturn(true);
        when(adminWorkflowService.addStep(any(), any(), any())).thenReturn(sampleDetail());

        String payload = """
                {
                  "stepCode":"EVENT_POST_EVENT_REPORT",
                  "stepLabel":"Compte rendu post-événement",
                  "responsibleRole":"RESPONSABLE_QUALITE",
                  "required":false,
                  "refusalReasonRequired":false,
                  "active":true,
                  "conditionType":"DOCUMENT_CONFIDENTIEL",
                  "allowedActions":["ARCHIVE"]
                }
                """;

        mockMvc.perform(post("/api/v1/admin/workflows/{workflowId}/steps", UUID.randomUUID())
                        .with(jwt().jwt(jwt -> jwt.claim("preferred_username", "admin.cnstn"))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());
    }

    @ParameterizedTest
    @ValueSource(strings = {"true"})
    void adminWithoutRequiredPermissionGets403(String ignored) throws Exception {
        when(userPermissionService.hasPermission(any(), any(), anySet())).thenReturn(false);

        mockMvc.perform(get("/api/v1/admin/workflows")
                        .with(jwt().jwt(jwt -> jwt.claim("preferred_username", "admin.cnstn"))
                                .authorities(new SimpleGrantedAuthority("ROLE_ADMIN"))))
                .andExpect(status().isForbidden());
    }

    private WorkflowDetailResponse sampleDetail() {
        Instant now = Instant.now();
        return new WorkflowDetailResponse(
                UUID.randomUUID(),
                WorkflowType.EVENT_WORKFLOW,
                "Workflow événement",
                "Événements",
                "Configuration",
                true,
                true,
                List.of(),
                "admin.cnstn",
                now,
                now,
                List.of()
        );
    }
}
