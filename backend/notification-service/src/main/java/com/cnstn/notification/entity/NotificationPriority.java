package com.cnstn.notification.entity;

public enum NotificationPriority {
    LOW,
    NORMAL,
    HIGH,
    CRITICAL;

    public boolean atLeast(NotificationPriority other) {
        return this.ordinal() >= other.ordinal();
    }
}
