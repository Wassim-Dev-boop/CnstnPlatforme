package com.cnstn.event.config;

import com.cnstn.event.client.permission.AuthUserPermissionClientProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
@EnableConfigurationProperties(AuthUserPermissionClientProperties.class)
public class AuthUserPermissionClientConfig {

    @Bean
    public RestTemplate authUserPermissionRestTemplate(
            RestTemplateBuilder restTemplateBuilder,
            AuthUserPermissionClientProperties properties
    ) {
        return restTemplateBuilder
                .rootUri(properties.getBaseUrl())
                .build();
    }
}
