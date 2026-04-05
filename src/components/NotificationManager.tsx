import React, { useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { NotificationService } from '../services/notificationService';
import { collection, query, where, onSnapshot, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Booking, Message, WorkerApplication } from '../types';
import { useTranslation } from 'react-i18next';

export const NotificationManager = () => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const scheduledReminders = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (user && profile) {
      // Initialize notifications
      NotificationService.requestPermissions().then((granted) => {
        if (granted) {
          NotificationService.registerToken(user.uid);
          NotificationService.addListeners();
        }
      });

      // 1. Listen for new booking requests (for workers)
      let unsubBookings: () => void;
      if (profile.role === 'worker' && (profile as any).workerId) {
        const q = query(
          collection(db, 'bookings'),
          where('workerId', '==', (profile as any).workerId),
          where('status', '==', 'pending')
        );
        unsubBookings = onSnapshot(q, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const booking = change.doc.data() as Booking;
              NotificationService.showLocalNotification(
                t('newBookingRequest'),
                `${booking.customerName} - ${t(booking.category)}`
              );
            }
          });
        });
      }

      // 2. Listen for booking confirmations (for customers)
      const qConfirmations = query(
        collection(db, 'bookings'),
        where('customerId', '==', user.uid),
        where('status', '==', 'confirmed')
      );
      const unsubConfirmations = onSnapshot(qConfirmations, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' || change.type === 'modified') {
            const booking = change.doc.data() as Booking;
            if (booking.status === 'confirmed') {
              NotificationService.showLocalNotification(
                t('bookingConfirmed'),
                `${booking.workerName} - ${t(booking.category)}`
              );

              // 3. Schedule upcoming service reminder (24h before)
              if (booking.scheduledTime && !scheduledReminders.current.has(booking.id)) {
                NotificationService.scheduleReminder(
                  booking.id,
                  booking.scheduledTime,
                  t('upcomingServiceReminder'),
                  `${t('serviceReminderBody')} ${booking.workerName}`
                );
                scheduledReminders.current.add(booking.id);
              }
            }
          }
        });
      });

      // 4. Listen for new messages
      // We listen to bookings where the user is a participant to get lastMessage updates
      const qMessagesCustomer = query(
        collection(db, 'bookings'),
        where('customerId', '==', user.uid),
        where('status', 'in', ['pending', 'confirmed'])
      );
      const unsubMessagesCustomer = onSnapshot(qMessagesCustomer, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const booking = change.doc.data() as Booking;
            if (booking.lastMessageSenderId !== user.uid && booking.lastMessage) {
              NotificationService.showLocalNotification(
                t('newMessage'),
                `${booking.lastMessage}`
              );
            }
          }
        });
      });

      let unsubMessagesWorker: (() => void) | undefined;
      if (profile.role === 'worker' && (profile as any).workerId) {
        const qMessagesWorker = query(
          collection(db, 'bookings'),
          where('workerId', '==', (profile as any).workerId),
          where('status', 'in', ['pending', 'confirmed'])
        );
        unsubMessagesWorker = onSnapshot(qMessagesWorker, (snapshot) => {
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'modified') {
              const booking = change.doc.data() as Booking;
              if (booking.lastMessageSenderId !== user.uid && booking.lastMessage) {
                NotificationService.showLocalNotification(
                  t('newMessage'),
                  `${booking.lastMessage}`
                );
              }
            }
          });
        });
      }

      // 5. Listen for worker application status updates
      const qApps = query(
        collection(db, 'workerApplications'),
        where('uid', '==', user.uid)
      );
      const unsubApps = onSnapshot(qApps, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const app = change.doc.data() as WorkerApplication;
            NotificationService.showLocalNotification(
              t('applicationUpdate'),
              `${t('applicationStatus')}: ${t(app.status)}`
            );
          }
        });
      });

      return () => {
        if (unsubBookings) unsubBookings();
        unsubConfirmations();
        unsubMessagesCustomer();
        if (unsubMessagesWorker) unsubMessagesWorker();
        unsubApps();
      };
    }
  }, [user, profile, t]);

  return null;
};
