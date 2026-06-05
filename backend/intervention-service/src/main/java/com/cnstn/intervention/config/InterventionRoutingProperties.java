package com.cnstn.intervention.config;

import java.util.ArrayList;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.intervention")
public class InterventionRoutingProperties {

    private List<String> roomManagerRecipients = new ArrayList<>();
    private List<String> itManagerRecipients = new ArrayList<>();
    private List<String> dsnRecipients = new ArrayList<>();
    private List<String> itResponsibleRecipients = new ArrayList<>();

    public List<String> getRoomManagerRecipients() {
        return roomManagerRecipients;
    }

    public void setRoomManagerRecipients(List<String> roomManagerRecipients) {
        this.roomManagerRecipients = roomManagerRecipients == null ? new ArrayList<>() : roomManagerRecipients;
    }

    public List<String> getItManagerRecipients() {
        return itManagerRecipients;
    }

    public void setItManagerRecipients(List<String> itManagerRecipients) {
        this.itManagerRecipients = itManagerRecipients == null ? new ArrayList<>() : itManagerRecipients;
    }

    public List<String> getDsnRecipients() {
        return dsnRecipients;
    }

    public void setDsnRecipients(List<String> dsnRecipients) {
        this.dsnRecipients = dsnRecipients == null ? new ArrayList<>() : dsnRecipients;
    }

    public List<String> getItResponsibleRecipients() {
        return itResponsibleRecipients;
    }

    public void setItResponsibleRecipients(List<String> itResponsibleRecipients) {
        this.itResponsibleRecipients = itResponsibleRecipients == null ? new ArrayList<>() : itResponsibleRecipients;
    }
}
