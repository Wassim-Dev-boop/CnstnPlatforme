package com.cnstn.authuser.config;

import com.cnstn.authuser.client.keycloak.KeycloakProperties;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
@EnableConfigurationProperties(KeycloakProperties.class)
public class KeycloakClientConfig {

    @Bean
    public RestTemplate keycloakRestTemplate(RestTemplateBuilder restTemplateBuilder, KeycloakProperties properties) {
        return restTemplateBuilder
                .rootUri(properties.getServerUrl())
                .build();
    }
}
