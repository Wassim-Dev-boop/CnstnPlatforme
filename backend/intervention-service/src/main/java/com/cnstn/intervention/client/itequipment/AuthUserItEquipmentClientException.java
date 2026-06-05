package com.cnstn.intervention.client.itequipment;

public class AuthUserItEquipmentClientException extends RuntimeException {

    private final int statusCode;
    private final String responseBody;

    public AuthUserItEquipmentClientException(String message, int statusCode, String responseBody, Throwable cause) {
        super(message, cause);
        this.statusCode = statusCode;
        this.responseBody = responseBody;
    }

    public AuthUserItEquipmentClientException(String message, Throwable cause) {
        super(message, cause);
        this.statusCode = -1;
        this.responseBody = null;
    }

    public int getStatusCode() {
        return statusCode;
    }

    public String getResponseBody() {
        return responseBody;
    }
}
