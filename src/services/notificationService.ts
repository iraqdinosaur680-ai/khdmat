import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

export class NotificationService {
  private static isPushSupported = Capacitor.getPlatform() !== 'web';

  static async requestPermissions() {
    if (!this.isPushSupported) return false;

    let permStatus = await PushNotifications.checkPermissions();

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions();
    }

    if (permStatus.receive !== 'granted') {
      return false;
    }

    await PushNotifications.register();
    return true;
  }

  static async registerToken(userId: string) {
    if (!this.isPushSupported) return;

    PushNotifications.addListener('registration', async (token) => {
      const userRef = doc(db, 'users', userId);
      try {
        await updateDoc(userRef, {
          fcmToken: token.value
        });
      } catch (error) {
        console.error('Error updating FCM token:', error);
      }
    });

    PushNotifications.addListener('registrationError', (err) => {
      console.error('Registration error: ', err.error);
    });
  }

  static async addListeners() {
    if (!this.isPushSupported) return;

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received: ', notification);
      // You can trigger a local notification here if you want to show it while app is in foreground
      this.showLocalNotification(
        notification.title || 'New Notification',
        notification.body || ''
      );
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Push action performed: ', notification);
    });
  }

  static async showLocalNotification(title: string, body: string, id: number = Math.floor(Math.random() * 10000)) {
    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id,
          schedule: { at: new Date(Date.now() + 1000) }, // Show almost immediately
          sound: 'default',
          attachments: [],
          actionTypeId: '',
          extra: null
        }
      ]
    });
  }

  static async scheduleReminder(bookingId: string, scheduledTime: string, title: string, body: string) {
    const scheduledDate = new Date(scheduledTime);
    const reminderDate = new Date(scheduledDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours before

    if (reminderDate.getTime() <= Date.now()) {
      // If it's already less than 24h, schedule for 1 hour from now or skip
      return;
    }

    await LocalNotifications.schedule({
      notifications: [
        {
          title,
          body,
          id: Math.floor(Math.random() * 10000),
          schedule: { at: reminderDate },
          sound: 'default',
          extra: { bookingId }
        }
      ]
    });
  }

  static async cancelAllNotifications() {
    await LocalNotifications.cancel({ notifications: [] });
  }
}
