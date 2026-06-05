package com.cnstn.ged;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@EnableFeignClients
@SpringBootApplication
public class GedServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(GedServiceApplication.class, args);
    }
}
