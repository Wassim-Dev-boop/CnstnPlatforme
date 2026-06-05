package com.cnstn.authuser.client.keycloak;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties(prefix = "app.keycloak")
public class KeycloakProperties {

    @NotBlank
    private String serverUrl;

    @NotBlank
    private String realm;

    @NotBlank
    private String adminRealm = "cnstn-intranet";

    @NotBlank
    private String clientId;

    @NotBlank
    private String clientSecret;

    @NotBlank
    private String loginClientId = "cnstn-postman";

    private String loginClientSecret = "";

    public String getServerUrl() {
        return serverUrl;
    }

    public void setServerUrl(String serverUrl) {
        this.serverUrl = serverUrl;
    }

    public String getRealm() {
        return realm;
    }

    public void setRealm(String realm) {
        this.realm = realm;
    }

    public String getAdminRealm() {
        return adminRealm;
    }

    public void setAdminRealm(String adminRealm) {
        this.adminRealm = adminRealm;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecret() {
        return clientSecret;
    }

    public void setClientSecret(String clientSecret) {
        this.clientSecret = clientSecret;
    }

    public String getLoginClientId() {
        return loginClientId;
    }

    public void setLoginClientId(String loginClientId) {
        this.loginClientId = loginClientId;
    }

    public String getLoginClientSecret() {
        return loginClientSecret;
    }

    public void setLoginClientSecret(String loginClientSecret) {
        this.loginClientSecret = loginClientSecret;
    }
}
