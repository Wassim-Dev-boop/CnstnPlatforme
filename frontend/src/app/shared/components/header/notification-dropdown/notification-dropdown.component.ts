import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { Notification, NotificationType } from '../../../../core/models';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationService } from '../../../../core/services/notification.service';
import { DropdownComponent } from '../../ui/dropdown/dropdown.component';

@Component({
  selector: 'app-notification-dropdown',
  templateUrl: './notification-dropdown.component.html',
  imports:[CommonModule, RouterModule, DropdownComponent]
})
export class NotificationDropdownComponent implements OnInit, OnDestroy {
  isOpen = false;
  currentRecipient = 'current-user';
  notifications: Notification[] = [];
  unreadCount = 0;

  private authSubscription?: Subscription;
  private notificationsSubscription?: Subscription;
  private unreadSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.authSubscription = this.authService.currentUser$.subscribe((user) => {
      this.currentRecipient = this.resolveRecipientKey(user);
      this.subscribeNotifications();
    });

    this.unreadSubscription = this.notificationService.getUnreadCount().subscribe((count) => {
      this.unreadCount = count;
    });
  }

  ngOnDestroy(): void {
    this.authSubscription?.unsubscribe();
    this.notificationsSubscription?.unsubscribe();
    this.unreadSubscription?.unsubscribe();
  }

  get latestNotifications(): Notification[] {
    return [...this.notifications]
      .sort((left, right) => this.toDate(right.createdAt).getTime() - this.toDate(left.createdAt).getTime())
      .slice(0, 6);
  }

  get notifying(): boolean {
    return this.unreadCount > 0;
  }

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  closeDropdown() {
    this.isOpen = false;
  }

  markAllAsRead(event: Event): void {
    event.stopPropagation();
    if (this.unreadCount === 0) {
      return;
    }

    this.notificationService.markAllAsRead(this.currentRecipient).subscribe(() => {
      this.notifications = this.notifications.map((notification) => ({
        ...notification,
        isRead: true,
        readAt: new Date(),
      }));
    });
  }

  openNotification(notification: Notification): void {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification.id).subscribe(() => {
        this.notifications = this.notifications.map((item) => {
          if (item.id !== notification.id) {
            return item;
          }

          return {
            ...item,
            isRead: true,
            readAt: new Date(),
          };
        });
      });
    }

    this.isOpen = false;
    const actionUrl = notification.data?.actionUrl;
    if (actionUrl && actionUrl.startsWith('/')) {
      this.router.navigateByUrl(actionUrl);
      return;
    }

    this.router.navigateByUrl('/notifications');
  }

  goToAllNotifications(): void {
    this.isOpen = false;
    this.router.navigateByUrl('/notifications');
  }

  getCategoryLabel(notification: Notification): string {
    const category = this.resolveCategory(notification);

    if (category === 'reservation') {
      return 'Reservation';
    }
    if (category === 'intervention') {
      return 'Intervention';
    }
    if (category === 'event') {
      return 'Evenement';
    }
    if (category === 'ged') {
      return 'GED';
    }
    if (category === 'equipment') {
      return 'Equipement';
    }

    return 'Systeme';
  }

  getBadgeClass(notification: Notification): string {
    const category = this.resolveCategory(notification);
    const text = this.getNotificationText(notification);

    if (category === 'intervention') {
      if (text.includes('critique')) {
        return 'bg-error-50 text-error-700 dark:bg-error-500/20 dark:text-error-300';
      }

      return 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-300';
    }

    if (category === 'reservation') {
      return 'bg-success-50 text-success-700 dark:bg-success-500/20 dark:text-success-300';
    }

    if (category === 'event') {
      return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300';
    }

    if (category === 'ged') {
      return 'bg-blue-50 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300';
    }

    if (category === 'equipment') {
      return 'bg-warning-50 text-warning-700 dark:bg-warning-500/20 dark:text-warning-300';
    }

    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  }

  getLeadingDotClass(notification: Notification): string {
    const category = this.resolveCategory(notification);
    const text = this.getNotificationText(notification);

    if (category === 'intervention') {
      if (text.includes('critique')) {
        return 'bg-error-500';
      }

      return 'bg-success-500';
    }

    if (category === 'reservation') {
      return 'bg-success-500';
    }

    if (category === 'event') {
      return 'bg-indigo-500';
    }

    if (category === 'ged') {
      return 'bg-blue-500';
    }

    if (category === 'equipment') {
      return 'bg-warning-500';
    }

    return 'bg-gray-500';
  }

  getRelativeTime(value: Date): string {
    const date = this.toDate(value);
    const now = new Date();
    const diffMs = Math.max(now.getTime() - date.getTime(), 0);
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 60) {
      return `Il y a ${Math.max(diffMinutes, 1)} min`;
    }

    if (this.isToday(date)) {
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      if (minutes === 0) {
        return `Il y a ${hours} h`;
      }

      return `Il y a ${hours} h ${minutes} min`;
    }

    if (this.isYesterday(date)) {
      return `Hier ${this.formatTime(date)}`;
    }

    return this.formatDate(date);
  }

  private subscribeNotifications(): void {
    this.notificationsSubscription?.unsubscribe();
    this.notificationsSubscription = this.notificationService
      .getNotifications(this.currentRecipient)
      .subscribe((notifications) => {
        this.notifications = Array.isArray(notifications) ? notifications : [];
      });
  }

  private resolveRecipientKey(user: { id?: string; username?: string; email?: string } | null): string {
    if (!user) {
      return 'current-user';
    }

    const username = user.username?.trim();
    if (username) {
      return username;
    }

    const email = user.email?.trim().toLowerCase() ?? '';
    if (email.includes('@')) {
      return email.split('@')[0];
    }

    return user.id?.trim() || 'current-user';
  }

  private resolveCategory(notification: Notification): 'reservation' | 'intervention' | 'event' | 'ged' | 'equipment' | 'system' {
    const text = this.getNotificationText(notification);

    if (text.includes('materiel') || text.includes('equipement')) {
      return 'equipment';
    }

    if (
      notification.type === NotificationType.RESERVATION_APPROVED ||
      notification.type === NotificationType.RESERVATION_REJECTED
    ) {
      return 'reservation';
    }

    if (
      notification.type === NotificationType.INTERVENTION_ASSIGNED ||
      notification.type === NotificationType.INTERVENTION_UPDATED ||
      notification.type === NotificationType.INTERVENTION_COMPLETED
    ) {
      return 'intervention';
    }

    if (
      notification.type === NotificationType.INVITATION_SENT ||
      notification.type === NotificationType.INVITATION_ACCEPTED ||
      notification.type === NotificationType.INVITATION_DECLINED ||
      notification.type === NotificationType.EVENT_REMINDER
    ) {
      return 'event';
    }

    if (notification.type === NotificationType.DOCUMENT_SHARED) {
      return 'ged';
    }

    return 'system';
  }

  private getNotificationText(notification: Notification): string {
    return `${notification.title} ${notification.message}`.trim().toLowerCase();
  }

  private isToday(date: Date): boolean {
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  private isYesterday(date: Date): boolean {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    return (
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate()
    );
  }

  private formatTime(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}h${minutes}`;
  }

  private formatDate(date: Date): string {
    const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${date.getDate()} ${months[date.getMonth()]}`;
  }

  private toDate(value: Date): Date {
    return value instanceof Date ? value : new Date(value);
  }
}
