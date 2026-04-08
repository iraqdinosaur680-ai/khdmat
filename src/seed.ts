import { db } from './firebase';
import { setDoc, doc, getDocs, collection, writeBatch } from 'firebase/firestore';
import { WorkerProfile, Category } from './types';
import { handleFirestoreError, OperationType } from './lib/firestore-error-handler';

const defaultCategories: Category[] = [
  { id: 'plumbing', icon: '💧', nameEn: 'Plumbing', nameAr: 'السباكة', nameKu: 'بۆری ئاو', order: 1, active: true },
  { id: 'acFixing', icon: '❄️', nameEn: 'AC Fixing', nameAr: 'تصليح المكيفات', nameKu: 'چاککردنەوەی سپلیت', order: 2, active: true },
  { id: 'electrical', icon: '⚡', nameEn: 'Electrical', nameAr: 'الكهرباء', nameKu: 'کارەبایی', order: 3, active: true },
  { id: 'cleaning', icon: '🧹', nameEn: 'Cleaning', nameAr: 'التنظيف', nameKu: 'پاککردنەوە', order: 4, active: true },
  { id: 'gardening', icon: '🌳', nameEn: 'Gardening', nameAr: 'البستنة', nameKu: 'باخچەوانی', order: 5, active: true },
  { id: 'carpentry', icon: '🪚', nameEn: 'Carpentry', nameAr: 'النجارة', nameKu: 'دارتاشی', order: 6, active: true },
  { id: 'painting', icon: '🎨', nameEn: 'Painting', nameAr: 'الطلاء', nameKu: 'بۆیاخکردن', order: 7, active: true },
  { id: 'applianceRepair', icon: '🛠️', nameEn: 'Appliance Repair', nameAr: 'تصليح أجهزة', nameKu: 'چاککردنەوەی ئامێرەکان', order: 8, active: true },
  { id: 'pestControl', icon: '🐜', nameEn: 'Pest Control', nameAr: 'مكافحة الحشرات', nameKu: 'قڕکردنی مێروو', order: 9, active: true },
  { id: 'locksmith', icon: '🔑', nameEn: 'Locksmith', nameAr: 'حداد أقفال', nameKu: 'قوفڵساز', order: 10, active: true },
  { id: 'movingDelivery', icon: '📦', nameEn: 'Moving & Delivery', nameAr: 'نقل وتوصيل', nameKu: 'گواستنەوە و گەیاندن', order: 11, active: true },
  { id: 'decoration', icon: '🏠', nameEn: 'Decoration', nameAr: 'ديكور', nameKu: 'دیکۆر', order: 12, active: true },
  { id: 'securityCameras', icon: '🛡️', nameEn: 'Security Cameras', nameAr: 'كاميرات مراقبة', nameKu: 'کامێرای چاودێری', order: 13, active: true },
  { id: 'internet', icon: '🌐', nameEn: 'Internet & Wi-Fi', nameAr: 'إنترنت وواي فاي', nameKu: 'ئینتەرنێت و وای فای', order: 14, active: true },
];

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
    const batch = writeBatch(db);

    // Seed Categories if they don't exist
    const catSnap = await getDocs(collection(db, 'categories'));
    if (catSnap.empty) {
      for (const cat of defaultCategories) {
        batch.set(doc(db, 'categories', cat.id), cat);
      }
    }

    for (const worker of mockWorkers) {
      batch.set(doc(db, 'workers', worker.uid!), worker);
      // Also add to users collection for auth consistency
      batch.set(doc(db, 'users', worker.uid!), {
        uid: worker.uid,
        name: worker.name,
        email: worker.email,
        city: worker.city,
        role: 'worker',
        profession: worker.profession,
        createdAt: worker.createdAt
      });
    }
    
    await batch.commit();
    console.log('Mock data seeded!');
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seed');
  }
};
