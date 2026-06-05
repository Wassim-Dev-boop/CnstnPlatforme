package com.cnstn.notification.exception;

public class InvalidInternalApiKeyException extends RuntimeException {

    public InvalidInternalApiKeyException() {
        super("Invalid internal API key");
    }
}

