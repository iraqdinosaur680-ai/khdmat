import { db } from './firebase';
import { setDoc, doc } from 'firebase/firestore';
import { WorkerProfile } from './types';
import { handleFirestoreError, OperationType } from './lib/firestore-error-handler';

const mockWorkers: Partial<WorkerProfile>[] = [
  {
    uid: 'worker1',
    name: 'Ahmed Hassan',
    email: 'ahmed@example.com',
    city: 'Baghdad',
    role: 'worker',
    profession: 'plumbing',
    workingHours: '8 AM - 6 PM',
    hasTransport: true,
    rating: 4.8,
    phone: '+964 770 123 4567',
    location: { lat: 33.3152, lng: 44.3661 },
    createdAt: Date.now(),
  },
  {
    uid: 'worker2',
    name: 'Mustafa Ali',
    email: 'mustafa@example.com',
    city: 'Baghdad',
    role: 'worker',
    profession: 'acFixing',
    workingHours: '9 AM - 9 PM',
    hasTransport: true,
    rating: 4.9,
    phone: '+964 780 987 6543',
    location: { lat: 33.3128, lng: 44.3615 },
    createdAt: Date.now(),
  },
  {
    uid: 'worker3',
    name: 'Zainab Kareem',
    email: 'zainab@example.com',
    city: 'Baghdad',
    role: 'worker',
    profession: 'cleaning',
    workingHours: '7 AM - 3 PM',
    hasTransport: false,
    rating: 4.7,
    phone: '+964 750 111 2222',
    location: { lat: 33.3100, lng: 44.3600 },
    createdAt: Date.now(),
  },
  {
    uid: 'worker4',
    name: 'Omar Khalid',
    email: 'omar@example.com',
    city: 'Baghdad',
    role: 'worker',
    profession: 'gardening',
    workingHours: '6 AM - 2 PM',
    hasTransport: true,
    rating: 4.6,
    phone: '+964 771 333 4444',
    location: { lat: 33.3200, lng: 44.3700 },
    createdAt: Date.now(),
  },
  {
    uid: 'worker5',
    name: 'Ali Jassim',
    email: 'ali@example.com',
    city: 'Baghdad',
    role: 'worker',
    profession: 'internet',
    workingHours: '9 AM - 6 PM',
    hasTransport: true,
    rating: 4.9,
    phone: '+964 772 555 6666',
    location: { lat: 33.3300, lng: 44.3800 },
    createdAt: Date.now(),
  }
];

export const seedMockData = async () => {
  try {
    for (const worker of mockWorkers) {
      await setDoc(doc(db, 'workers', worker.uid!), worker);
      // Also add to users collection for auth consistency
      await setDoc(doc(db, 'users', worker.uid!), {
        uid: worker.uid,
        name: worker.name,
        email: worker.email,
        city: worker.city,
        role: 'worker',
        profession: worker.profession,
        createdAt: worker.createdAt
      });
    }
    console.log('Mock data seeded!');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'workers/users');
  }
};
