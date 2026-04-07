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

      // Flags to ignore initial snapshots
      let isInitialBookings = true;
      let isInitialConfirmations = true;
      let isInitialMessagesCustomer = true;
      let isInitialMessagesWorker = true;
      let isInitialApps = true;

      // 1. Listen for new booking requests (for workers)
      let unsubBookings: () => void;
      if (profile.role === 'worker' && (profile as any).workerId) {
        const q = query(
          collection(db, 'bookings'),
          where('workerId', '==', (profile as any).workerId),
          where('status', '==', 'pending')
        );
        unsubBookings = onSnapshot(q, (snapshot) => {
          if (isInitialBookings) {
            isInitialBookings = false;
            return;
          }
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const booking = change.doc.data() as Booking;
              NotificationService.showLocalNotification(
                t('newBookingRequest'),
                `${booking.customerName} - ${t(booking.category)}`
              );
            }
          });
        }, (error) => {
          console.error("NotificationManager: unsubBookings error", error);
        });
      }

      // 2. Listen for booking confirmations (for customers)
      const qConfirmations = query(
        collection(db, 'bookings'),
        where('customerId', '==', user.uid),
        where('status', '==', 'confirmed')
      );
      const unsubConfirmations = onSnapshot(qConfirmations, (snapshot) => {
        if (isInitialConfirmations) {
          isInitialConfirmations = false;
          return;
        }
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
      }, (error) => {
        console.error("NotificationManager: unsubConfirmations error", error);
      });

      // 4. Listen for new messages
      const qMessagesCustomer = query(
        collection(db, 'bookings'),
        where('customerId', '==', user.uid),
        where('status', 'in', ['pending', 'confirmed'])
      );
      const unsubMessagesCustomer = onSnapshot(qMessagesCustomer, (snapshot) => {
        if (isInitialMessagesCustomer) {
          isInitialMessagesCustomer = false;
          return;
        }
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
      }, (error) => {
        console.error("NotificationManager: unsubMessagesCustomer error", error);
      });

      let unsubMessagesWorker: (() => void) | undefined;
      if (profile.role === 'worker' && (profile as any).workerId) {
        const qMessagesWorker = query(
          collection(db, 'bookings'),
          where('workerId', '==', (profile as any).workerId),
          where('status', 'in', ['pending', 'confirmed'])
        );
        unsubMessagesWorker = onSnapshot(qMessagesWorker, (snapshot) => {
          if (isInitialMessagesWorker) {
            isInitialMessagesWorker = false;
            return;
          }
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
        }, (error) => {
          console.error("NotificationManager: unsubMessagesWorker error", error);
        });
      }

      // 5. Listen for worker application status updates
      const qApps = query(
        collection(db, 'workerApplications'),
        where('uid', '==', user.uid)
      );
      const unsubApps = onSnapshot(qApps, (snapshot) => {
        if (isInitialApps) {
          isInitialApps = false;
          return;
        }
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'modified') {
            const app = change.doc.data() as WorkerApplication;
            NotificationService.showLocalNotification(
              t('applicationUpdate'),
              `${t('applicationStatus')}: ${t(app.status)}`
            );
          }
        });
      }, (error) => {
        console.error("NotificationManager: unsubApps error", error);
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
