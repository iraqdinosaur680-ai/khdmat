export type City = 
  | 'Baghdad' | 'Basra' | 'Mosul' | 'Erbil' | 'Najaf' 
  | 'Karbala' | 'Kirkuk' | 'Sulaymaniyah' | 'Hilla' | 'Nasiriyah'
  | 'Amara' | 'Kut' | 'Ramadi' | 'Fallujah' | 'Samarra'
  | 'Duhok' | 'Zakho' | 'Baqubah';

export const IRAQI_CITIES: City[] = [
  'Baghdad', 'Basra', 'Mosul', 'Erbil', 'Najaf', 
  'Karbala', 'Kirkuk', 'Sulaymaniyah', 'Hilla', 'Nasiriyah',
  'Amara', 'Kut', 'Ramadi', 'Fallujah', 'Samarra',
  'Duhok', 'Zakho', 'Baqubah'
];

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  phone: string;
  photoURL?: string;
  city: City;
  role: 'user' | 'worker' | 'admin';
  createdAt: number;
  fcmToken?: string;
}

export interface WorkerProfile extends UserProfile {
  profession: string;
  specialties: string[];
  service_area: City[];
  workingHours: string;
  hasTransport: boolean;
  rating: number;
  isAvailable?: boolean;
  description?: string;
  photos?: string[];
  location: {
    lat: number;
    lng: number;
  };
}

export interface Booking {
  id: string;
  customerId: string;
  customerEmail?: string;
  customerName: string;
  customerPhone: string;
  workerId: string;
  workerEmail?: string;
  workerName: string;
  workerPhone: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'denied';
  timestamp: number;
  category: string;
  city: City;
  description: string;
  location: string;
  locationDescription?: string;
  lat?: number;
  lng?: number;
  rating?: number;
  review?: string;
  lastMessage?: string;
  lastMessageSenderId?: string;
  lastMessageTimestamp?: number;
  scheduledTime?: string;
  cancellationReason?: string;
}

export interface Message {
  id: string;
  bookingId: string;
  senderId: string;
  customerEmail?: string;
  workerEmail?: string;
  text: string;
  timestamp: number;
  read?: boolean;
}

export interface WorkerApplication {
  uid: string;
  phone: string;
  email: string;
  nationalId: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp: number;
}

export interface Review {
  id: string;
  bookingId: string;
  workerId: string;
  customerId: string;
  customerName: string;
  customerPhoto?: string;
  rating: number;
  comment: string;
  timestamp: number;
}

export interface Report {
  id: string;
  bookingId: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  details: string;
  timestamp: number;
  status: 'pending' | 'reviewed' | 'resolved';
}

export interface AppSettings {
  supportEmail: string;
  supportPhone: string;
  whatsappNumber: string;
  useInternalApplications?: boolean;
  becomeWorkerWhatsappMessage?: string;
  becomeWorkerWhatsappNumber?: string;
}

export interface Ad {
  id: string;
  title: string;
  description: string;
  imageURL: string;
  link?: string;
  active: boolean;
  order: number;
  createdAt: number;
}
