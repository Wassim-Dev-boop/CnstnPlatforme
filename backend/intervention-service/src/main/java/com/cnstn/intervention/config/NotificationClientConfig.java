package com.cnstn.intervention.config;

import com.cnstn.intervention.client.notification.NotificationClientProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

@Configuration
@EnableConfigurationProperties(NotificationClientProperties.class)
public class NotificationClientConfig {

    @Bean
    public RestTemplate notificationRestTemplate(
            RestTemplateBuilder restTemplateBuilder,
            NotificationClientProperties properties
    ) {
        return restTemplateBuilder
                .rootUri(properties.getBaseUrl())
                .build();
    }
}
