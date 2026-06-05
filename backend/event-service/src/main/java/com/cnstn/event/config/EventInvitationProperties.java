package com.cnstn.event.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.events.invitations")
public class EventInvitationProperties {

    private String frontendInvitationsUrl = "http://localhost:4200/invitations";

    public String getFrontendInvitationsUrl() {
        return frontendInvitationsUrl;
    }

    public void setFrontendInvitationsUrl(String frontendInvitationsUrl) {
        this.frontendInvitationsUrl = frontendInvitationsUrl;
    }
}

