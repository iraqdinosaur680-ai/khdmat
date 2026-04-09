import React, { useEffect, useState, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, HelpCircle, User, Users, Briefcase, Settings, LogOut, 
  Menu, X, MessageSquare, Bell,
  Sun, Moon, Globe, ChevronRight, ChevronLeft,
  Search, Filter, Star, Phone, Calendar, CheckCircle,
  AlertCircle, Info, Mail, Lock, UserPlus, LogIn,
  MapPin, Clock, Truck, ShieldCheck, Pin, Flag,
  Plus, Trash2, Edit3, MessageCircle, FileText, Camera, Grid, Image as ImageIcon
} from 'lucide-react';
import { AuthProvider, useAuth } from './AuthContext';
import { auth, db } from './firebase';
import { 
  signOut, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  RecaptchaVerifier,
  linkWithPhoneNumber,
  linkWithCredential,
  PhoneAuthProvider,
  GoogleAuthProvider,
  signInWithCredential,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import { doc, setDoc, getDoc, collection, query, where, onSnapshot, addDoc, serverTimestamp, getDocFromServer, deleteDoc, limit, updateDoc, writeBatch, getDocs, orderBy } from 'firebase/firestore';
import { City, IRAQI_CITIES, UserProfile, WorkerProfile, Booking, Message, WorkerApplication, Review, Report, Ad, Category } from './types';
import { cn } from './lib/utils';
import './i18n';
import { NotificationManager } from './components/NotificationManager';
import { handleFirestoreError, OperationType } from './lib/firestore-error-handler';
import { seedMockData } from './seed';
import { AppSettings } from './types';

// --- Hooks ---

const useSettings = () => {
  const [settings, setSettings] = useState<AppSettings>({
    supportEmail: 'support@khdmat.iq',
    supportPhone: '+964 770 000 0000',
    whatsappNumber: '9647700000000',
    becomeWorkerWhatsappNumber: '9647700000000',
    useInternalApplications: false,
    becomeWorkerWhatsappMessage: 'hi, how can i work for KHDMAT / مرحبا، كيف يمكنني العمل مع خدمات'
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'settings', 'app_settings'), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AppSettings);
      }
    }, (error) => {
      console.error("App: app_settings snapshot error", error);
    });
    return () => unsubscribe();
  }, []);

  return settings;
};

// --- Components ---

const ConfirmDialog = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = 'danger'
}: { 
  isOpen: boolean; 
  title: string; 
  message: string; 
  onConfirm: () => void; 
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'primary'
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
      >
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{message}</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-sm"
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm}
            className={cn(
              "flex-1 py-2 text-white rounded-xl font-bold text-sm",
              type === 'danger' ? "bg-red-500" : "bg-primary"
            )}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Alert = ({ 
  isOpen, 
  title, 
  message, 
  onClose,
  type = 'info'
}: { 
  isOpen: boolean; 
  title: string; 
  message: string; 
  onClose: () => void;
  type?: 'info' | 'success' | 'error'
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl text-center"
      >
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4",
          type === 'success' ? "bg-green-100 text-green-600" : 
          type === 'error' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
        )}>
          {type === 'success' ? <CheckCircle size={24} /> : 
           type === 'error' ? <AlertCircle size={24} /> : <Info size={24} />}
        </div>
        <h3 className="text-xl font-bold mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{message}</p>
        <button 
          onClick={onClose}
          className="w-full py-2 bg-primary text-white rounded-xl font-bold text-sm"
        >
          OK
        </button>
      </motion.div>
    </div>
  );
};

const CancelBookingDialog = ({ 
  isOpen, 
  onConfirm, 
  onCancel 
}: { 
  isOpen: boolean; 
  onConfirm: (reason: string) => void; 
  onCancel: () => void;
}) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('reason_changed_mind');

  if (!isOpen) return null;

  const reasons = [
    'reason_changed_mind',
    'reason_found_another',
    'reason_not_needed',
    'reason_emergency'
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
      >
        <h3 className="text-xl font-bold mb-2">{t('cancelBooking')}</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{t('confirmCancel')}</p>
        
        <div className="space-y-2 mb-6">
          <label className="text-xs font-bold text-gray-500 uppercase">{t('cancellationReason')}</label>
          <div className="space-y-2">
            {reasons.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={cn(
                  "w-full p-3 rounded-xl text-sm font-medium text-left transition-all border",
                  reason === r 
                    ? "bg-primary/10 border-primary text-primary" 
                    : "bg-gray-50 dark:bg-gray-900 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                {t(r)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-sm"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={() => onConfirm(reason)}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/20"
          >
            {t('cancelBooking')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const testConnection = async () => {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message?.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
};
testConnection();

const LoadingScreen = ({ inline }: { inline?: boolean }) => (
  <div className={cn(
    "flex items-center justify-center",
    inline ? "p-8 w-full" : "fixed inset-0 bg-white dark:bg-black z-50"
  )}>
    <motion.div
      animate={{ scale: [1, 1.2, 1], rotate: [0, 360] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="text-primary text-4xl font-bold"
    >
      خدمات
    </motion.div>
  </div>
);

const ProfileSetupPopup = ({ onComplete }: { onComplete: (city: City, phone: string) => void }) => {
  const { t } = useTranslation();
  const [selectedCity, setSelectedCity] = useState<City>('Baghdad');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  useEffect(() => {
    return () => {
      if (recaptchaVerifier.current) {
        try {
          recaptchaVerifier.current.clear();
        } catch (e) {
          console.error("Cleanup error:", e);
        }
        recaptchaVerifier.current = null;
      }
    };
  }, []);

  const formatPhoneNumber = (p: string) => {
    let cleaned = p.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = cleaned.substring(1);
    if (cleaned.startsWith('964')) cleaned = cleaned.substring(3);
    return `+964${cleaned}`;
  };

  const handleSendOtp = async () => {
    if (cooldown > 0) return;
    if (!phone || phone.length < 10) {
      setError(t('enterPhone'));
      return;
    }
    if (!auth.currentUser) return;
    setError('');
    setLoading(true);
    try {
      // Ensure we have a clean state for reCAPTCHA to avoid "already rendered" error
      if (recaptchaVerifier.current) {
        try {
          recaptchaVerifier.current.clear();
        } catch (e) {
          // Ignore clear errors
        }
        recaptchaVerifier.current = null;
      }
      
      if (recaptchaRef.current) {
        recaptchaRef.current.innerHTML = '';
        // Create a fresh container with a unique ID inside the ref
        const containerId = `recaptcha-container-${Date.now()}`;
        const container = document.createElement('div');
        container.id = containerId;
        recaptchaRef.current.appendChild(container);

        recaptchaVerifier.current = new RecaptchaVerifier(auth, containerId, {
          size: 'invisible',
          'callback': () => {
            console.log("reCAPTCHA solved");
          }
        });
        await recaptchaVerifier.current.render();
      }
      
      const formattedPhone = formatPhoneNumber(phone);
      
      if (Capacitor.isNativePlatform()) {
        // Use native Capacitor plugin to bypass web reCAPTCHA on mobile
        const { verificationId } = await FirebaseAuthentication.signInWithPhoneNumber({
          phoneNumber: formattedPhone,
        });
        setConfirmationResult({ verificationId } as any);
      } else {
        // Use web SDK with reCAPTCHA for browser
        const result = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier.current!);
        setConfirmationResult(result);
      }
      
      setCooldown(60);
    } catch (err: any) {
      console.error("Phone Auth Error:", err);
      const errorMessage = err.message || '';
      if (err.code === 'auth/too-many-requests' || errorMessage.includes('too-many-requests')) {
        setError(t('tooManyRequests'));
        setCooldown(120);
      } else if (err.code === 'auth/credential-already-in-use') {
        setError(t('phoneAlreadyRegistered'));
      } else if (err.code === 'auth/invalid-app-credential') {
        setError("Invalid app credential. Please ensure the domain is authorized in Firebase Console.");
      } else {
        setError(err.message);
      }
      // Reset recaptcha on error
      if (recaptchaVerifier.current) {
        try {
          recaptchaVerifier.current.clear();
        } catch (e) {}
        recaptchaVerifier.current = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      setError(t('invalidOtp'));
      return;
    }
    if (!auth.currentUser || !confirmationResult) return;
    setError('');
    setLoading(true);
    try {
      // Create credential and link it to the current user
      const credential = PhoneAuthProvider.credential(confirmationResult.verificationId, otp);
      
      // Update the firestore document first to ensure the app state is updated
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        phone: phone
      });

      // Try to link the phone number to the current auth account
      try {
        await linkWithCredential(auth.currentUser, credential);
      } catch (e: any) {
        // If linking fails (e.g. already linked to another account), we still proceed
        // because we updated the Firestore document which is the primary source for the app
        console.error("Linking error:", e);
        if (e.code === 'auth/credential-already-in-use') {
          setError(t('phoneAlreadyRegistered'));
          return;
        }
      }
      
      onComplete(selectedCity, phone);
    } catch (err: any) {
      console.error("OTP Verification Error:", err);
      setError(t('invalidOtp'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
      >
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="text-primary" size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">{t('setupProfile')}</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">{t('setupProfileDesc')}</p>
        
        {error && <p className="text-red-500 text-xs mb-4">{error}</p>}

        <div className="space-y-4 mb-6 text-left">
          {!confirmationResult ? (
            <>
              <div>
                <label className="block text-xs font-bold mb-1 text-gray-500">{t('city')}</label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value as City)}
                  className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-primary"
                >
                  {IRAQI_CITIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1 text-gray-500">{t('phone')}</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XXXXXXXX"
                    className="w-full pl-10 pr-4 py-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold mb-1 text-gray-500">{t('enterOtp')}</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="XXXXXX"
                className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 outline-none focus:ring-2 focus:ring-primary text-center tracking-[1em] font-bold"
                maxLength={6}
              />
              <button 
                onClick={() => setConfirmationResult(null)}
                className="text-xs text-primary mt-2 hover:underline"
              >
                {t('changeCity')} / {t('phone')}
              </button>
            </div>
          )}
        </div>

        <div ref={recaptchaRef}></div>

        <button
          onClick={confirmationResult ? handleVerifyOtp : handleSendOtp}
          disabled={loading || (!confirmationResult && cooldown > 0)}
          className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? t('loading') : (confirmationResult ? t('verify') : (cooldown > 0 ? `${t('sendCode')} (${cooldown}s)` : t('sendCode')))}
        </button>
      </motion.div>
    </div>
  );
};

const PrivacyPolicyPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="max-w-4xl mx-auto p-6 py-12">
      <button 
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-2 text-primary font-bold hover:underline"
      >
        <ChevronLeft size={20} /> {t('back')}
      </button>
      <h1 className="text-3xl font-bold mb-8">{t('privacyPolicy')}</h1>
      <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">1. Introduction</h2>
          <p>Welcome to Khdmat ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, and share information when you use our application.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">2. Information We Collect</h2>
          <p>We collect information that you provide directly to us, such as when you create an account, update your profile, or use our services. This may include your name, email address, phone number, city, and profile photo.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">3. How We Use Your Information</h2>
          <p>We use the information we collect to provide, maintain, and improve our services, to process transactions, and to communicate with you about your account and our services.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">4. Sharing of Information</h2>
          <p>We do not share your personal information with third parties except as described in this policy, such as with service providers who perform services on our behalf or when required by law.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">5. Security</h2>
          <p>We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">6. Contact Us</h2>
          <p>If you have any questions about this Privacy Policy, please contact us at support@khdmat.iq.</p>
        </section>
      </div>
    </div>
  );
};

const TermsOfServicePage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="max-w-4xl mx-auto p-6 py-12">
      <button 
        onClick={() => navigate(-1)}
        className="mb-8 flex items-center gap-2 text-primary font-bold hover:underline"
      >
        <ChevronLeft size={20} /> {t('back')}
      </button>
      <h1 className="text-3xl font-bold mb-8">{t('termsOfService')}</h1>
      <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">1. Acceptance of Terms</h2>
          <p>By accessing or using the Khdmat application, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the application.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">2. Description of Service</h2>
          <p>Khdmat provides a platform to connect service providers with customers. We do not provide the services directly and are not responsible for the quality or delivery of services provided by third-party workers.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">3. User Responsibilities</h2>
          <p>Users are responsible for providing accurate information and for their interactions with other users. You must be at least 18 years old to use this service.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">4. Payments</h2>
          <p>Payments for services are handled directly between the customer and the service provider. Khdmat is not a party to these transactions and is not responsible for any payment disputes.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">5. Limitation of Liability</h2>
          <p>Khdmat shall not be liable for any direct, indirect, incidental, special, or consequential damages resulting from the use or inability to use our services.</p>
        </section>
        <section>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">6. Changes to Terms</h2>
          <p>We reserve the right to modify these terms at any time. Your continued use of the application after such changes constitutes your acceptance of the new terms.</p>
        </section>
      </div>
    </div>
  );
};

const AuthPage = () => {
  const { t, i18n } = useTranslation();
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState<City>('Baghdad');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Generate a deterministic email from the phone number for Firebase Auth
      const authEmail = `${phone.replace(/\D/g, '')}@khdmat.app`;

      if (isLogin) {
        const result = await signInWithEmailAndPassword(auth, authEmail, password);
        const isAdmin = authEmail === 'tahatariq20069@gmail.com' || authEmail === 'iraqdinosaur680@gmail.com' || authEmail === 'kadmatiq@gmail.com';
        
        const { getDocs } = await import('firebase/firestore');
        const workersQuery = query(collection(db, 'workers'), where('phone', '==', phone));
        const workerDocs = await getDocs(workersQuery);
        const isWorker = !workerDocs.empty;
        const workerData = isWorker ? workerDocs.docs[0].data() as WorkerProfile : null;

        const updates: any = {};
        if (isAdmin) updates.role = 'admin';
        else if (isWorker) {
          updates.role = 'worker';
          updates.workerId = workerData?.uid;
        }

        if (Object.keys(updates).length > 0) {
          await setDoc(doc(db, 'users', result.user.uid), updates, { merge: true });
        }
      } else {
        if (password !== confirmPassword) {
          throw new Error(t('passwordsDoNotMatch') || 'Passwords do not match');
        }
        const result = await createUserWithEmailAndPassword(auth, authEmail, password);
        
        const isAdmin = authEmail === 'tahatariq20069@gmail.com' || authEmail === 'iraqdinosaur680@gmail.com' || authEmail === 'kadmatiq@gmail.com';
        
        const { getDocs } = await import('firebase/firestore');
        const workersQuery = query(collection(db, 'workers'), where('phone', '==', phone));
        const workerDocs = await getDocs(workersQuery);
        const isWorker = !workerDocs.empty;
        const workerData = isWorker ? workerDocs.docs[0].data() as WorkerProfile : null;
        
        await setDoc(doc(db, 'users', result.user.uid), {
          uid: result.user.uid,
          name,
          email, // Optional email stored in profile
          phone,
          city: workerData?.city || '', 
          role: isAdmin ? 'admin' : (isWorker ? 'worker' : 'user'),
          workerId: isWorker ? workerData?.uid : null,
          createdAt: Date.now(),
        });
      }
    } catch (err: any) {
      if (err.code === 'permission-denied' || err.message?.includes('insufficient permissions')) {
        handleFirestoreError(err, OperationType.WRITE, 'users');
      } else if (err.code === 'auth/email-already-in-use') {
        setError(t('phoneAlreadyRegistered') || 'This phone number is already registered. Please log in.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError("Email/Password login is not enabled in the Firebase Console. Please enable it under Authentication > Sign-in method.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8"
      >
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-primary mb-2">{t('appName')}</h1>
          <p className="text-gray-500 dark:text-gray-400">{isLogin ? t('login') : t('register')}</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
            <AlertCircle size={18} />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-1">{t('name')}</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">{t('phone')}</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-1">{t('email')} ({t('optional')})</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">{t('password')}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>

          {!isLogin && (
            <div>
              <label className="block text-sm font-medium mb-1">{t('confirmPassword')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-opacity-90 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2"
          >
            {loading ? <LoadingScreen /> : (isLogin ? <LogIn size={20} /> : <UserPlus size={20} />)}
            {isLogin ? t('login') : t('register')}
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary font-bold hover:underline"
          >
            {isLogin ? t('register') : t('login')}
          </button>
        </p>

        <div className="mt-12 pt-6 border-t border-gray-100 dark:border-gray-700 text-center">
          <h2 className="text-lg font-bold mb-2">About Khdmat</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Khdmat is Iraq's premier platform connecting skilled service providers with customers. 
            Whether you need plumbing, electrical work, or home cleaning, Khdmat makes it easy to find 
            trusted professionals in your city.
          </p>

        </div>
      </motion.div>
    </div>
  );
};

const Header = ({ darkMode, setDarkMode }: { darkMode: boolean, setDarkMode: (v: boolean) => void }) => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const [workerData, setWorkerData] = useState<WorkerProfile | null>(null);

  useEffect(() => {
    if (profile?.role === 'worker' && (profile as any).workerId) {
      const unsubscribe = onSnapshot(doc(db, 'workers', (profile as any).workerId), (docSnap) => {
        if (docSnap.exists()) {
          setWorkerData(docSnap.data() as WorkerProfile);
        }
      }, (error) => {
        console.error("App: workerData dashboard snapshot error", error);
      });
      return () => unsubscribe();
    }
  }, [profile]);

  const toggleLanguage = async () => {
    const langs = ['ar', 'en', 'ku'];
    const currentIndex = langs.indexOf(i18n.language);
    const nextIndex = (currentIndex + 1) % langs.length;
    const newLang = langs[nextIndex];
    i18n.changeLanguage(newLang);
    
    if (profile?.uid) {
      try {
        await setDoc(doc(db, 'users', profile.uid), { language: newLang }, { merge: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, `users/${profile.uid}`);
      }
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="relative">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt={profile.name} className="w-10 h-10 rounded-full border-2 border-primary object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">
              {profile?.name?.charAt(0)}
            </div>
          )}
          {profile?.role === 'worker' && workerData && (
            <div className={cn(
              "absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-gray-800",
              workerData.isAvailable !== false ? "bg-green-500" : "bg-red-500"
            )} />
          )}
        </div>
        <div className="hidden sm:block">
          <p className="text-sm font-bold leading-none">{profile?.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-1">
            <MapPin size={12} /> {profile?.city}
          </p>
        </div>
      </div>

      <h1 className="text-2xl font-bold text-primary absolute left-1/2 -translate-x-1/2">{t('appName')}</h1>

      <div className="flex items-center gap-2">
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
        >
          <Settings size={24} />
        </button>
      </div>

      <AnimatePresence>
        {showSettings && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="fixed inset-0 bg-black bg-opacity-20 z-40"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="absolute top-16 right-4 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50"
            >
              <h3 className="font-bold mb-4 flex items-center gap-2"><Settings size={18} /> {t('settings')}</h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">{darkMode ? <Moon size={18} /> : <Sun size={18} />} {t('darkMode')}</span>
                  <button 
                    onClick={() => setDarkMode(!darkMode)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-colors relative",
                      darkMode ? "bg-primary" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-transform",
                      darkMode ? "translate-x-7" : "translate-x-1"
                    )} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><Globe size={18} /> {t('language')}</span>
                  <button 
                    onClick={toggleLanguage}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm font-bold"
                  >
                    {i18n.language === 'ar' ? 'العربية' : i18n.language === 'en' ? 'English' : 'كوردى'}
                  </button>
                </div>

                {profile?.role === 'admin' && (
                  <Link 
                    to="/admin" 
                    onClick={() => setShowSettings(false)}
                    className="w-full py-2 bg-primary/10 text-primary flex items-center justify-center gap-2 rounded-lg font-bold hover:bg-primary/20 transition-colors"
                  >
                    <ShieldCheck size={18} /> {t('adminDashboard')}
                  </Link>
                )}

                <button 
                  onClick={() => signOut(auth)}
                  className="w-full py-2 mt-2 text-red-500 flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <LogOut size={18} /> {t('logout')}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
};

const BottomNav = () => {
  const { t } = useTranslation();
  const location = useLocation();

  const navItems = [
    { path: '/', icon: Home, label: t('home') },
    { path: '/help', icon: HelpCircle, label: t('help') },
    { path: '/profile', icon: User, label: t('profile') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 py-1 flex justify-around items-center z-40">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link 
            key={item.path} 
            to={item.path}
            className={cn(
              "flex flex-col items-center p-2 rounded-xl transition-all",
              isActive ? "text-primary bg-primary/10" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
            )}
          >
            <item.icon size={24} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] mt-1 font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};

// --- Pages ---

const AdsCarousel = ({ ads }: { ads: Ad[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (ads.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ads.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [ads]);

  if (ads.length === 0) return null;

  return (
    <div className="relative w-full h-40 sm:h-48 overflow-hidden rounded-3xl mb-6 shadow-lg">
      <AnimatePresence mode="wait">
        <motion.div
          key={ads[currentIndex].id}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          <a 
            href={ads[currentIndex].link || '#'} 
            target={ads[currentIndex].link ? "_blank" : "_self"}
            rel="noopener noreferrer"
            className="block w-full h-full relative"
          >
            {ads[currentIndex].imageURL && (
              <img 
                src={ads[currentIndex].imageURL} 
                alt={ads[currentIndex].title} 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-4">
              <h3 className="text-white font-bold text-lg leading-tight">{ads[currentIndex].title}</h3>
              <p className="text-white/80 text-xs line-clamp-1">{ads[currentIndex].description}</p>
            </div>
          </a>
        </motion.div>
      </AnimatePresence>
      
      {ads.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {ads.map((_, i) => (
            <div 
              key={i} 
              className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                i === currentIndex ? "bg-white w-4" : "bg-white/50"
              )} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

const HomePage = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const settings = useSettings();
  const navigate = useNavigate();
  const [myRequests, setMyRequests] = useState<Booking[]>([]);
  const [recentChats, setRecentChats] = useState<Booking[]>([]);
  const [confirmData, setConfirmData] = useState<{ isOpen: boolean; bookingId: string } | null>(null);
  const [alertData, setAlertData] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [profilesCache, setProfilesCache] = useState<Record<string, { name: string; photoURL?: string }>>({});
  const [ads, setAds] = useState<Ad[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (!profile) return;
    const q = query(collection(db, 'ads'), where('active', '==', true), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAds(snapshot.docs.map(doc => doc.data() as Ad));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'ads');
    });
    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    const q = query(collection(db, 'categories'), where('active', '==', true), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        // Fallback to default categories if none exist in Firestore
        const defaultCategories: Category[] = [
          { id: 'plumbing', icon: '💧', nameEn: 'Plumbing', nameAr: 'سباكة', nameKu: 'بۆری ئاو', order: 1, active: true },
          { id: 'acFixing', icon: '❄️', nameEn: 'AC Fixing', nameAr: 'تصليح مكيفات', nameKu: 'چاککردنەوەی سپلیت', order: 2, active: true },
          { id: 'electrical', icon: '⚡', nameEn: 'Electrical', nameAr: 'كهرباء', nameKu: 'کارەبا', order: 3, active: true },
          { id: 'cleaning', icon: '🧹', nameEn: 'Cleaning', nameAr: 'تنظيف', nameKu: 'پاککردنەوە', order: 4, active: true },
          { id: 'gardening', icon: '🌳', nameEn: 'Gardening', nameAr: 'حدائق', nameKu: 'باخچە', order: 5, active: true },
          { id: 'carpentry', icon: '🔨', nameEn: 'Carpentry', nameAr: 'نجارة', nameKu: 'دارتاشی', order: 6, active: true },
          { id: 'painting', icon: '🎨', nameEn: 'Painting', nameAr: 'صباغة', nameKu: 'بۆیاخکردن', order: 7, active: true },
          { id: 'applianceRepair', icon: '🛠️', nameEn: 'Appliance Repair', nameAr: 'تصليح أجهزة', nameKu: 'چاککردنەوەی ئامێر', order: 8, active: true },
          { id: 'pestControl', icon: '🐜', nameEn: 'Pest Control', nameAr: 'مكافحة حشرات', nameKu: 'قڕکردنی مێروو', order: 9, active: true },
          { id: 'locksmith', icon: '🔑', nameEn: 'Locksmith', nameAr: 'أقفال', nameKu: 'قوفڵ', order: 10, active: true },
          { id: 'movingDelivery', icon: '📦', nameEn: 'Moving & Delivery', nameAr: 'نقل وتوصيل', nameKu: 'گواستنەوە', order: 11, active: true },
          { id: 'decoration', icon: '🖼️', nameEn: 'Decoration', nameAr: 'ديكور', nameKu: 'دیکۆر', order: 12, active: true },
          { id: 'securityCameras', icon: '📹', nameEn: 'Security Cameras', nameAr: 'كاميرات مراقبة', nameKu: 'کامێرای چاودێری', order: 13, active: true },
          { id: 'internet', icon: '🌐', nameEn: 'Internet', nameAr: 'انترنت', nameKu: 'ئەنتەرنێت', order: 14, active: true },
        ];
        setCategories(defaultCategories);
      } else {
        setCategories(snapshot.docs.map(doc => doc.data() as Category));
      }
    }, (error) => {
      console.error("Error fetching categories:", error);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (profile?.role === 'worker' && (profile as any).workerId) {
      const q = query(
        collection(db, 'bookings'),
        where('workerId', '==', (profile as any).workerId),
        where('status', '==', 'pending')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setMyRequests(snapshot.docs.map(doc => doc.data() as Booking));
      }, (error) => {
        console.error("App: myRequests snapshot error", error);
      });
      return () => unsubscribe();
    }
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    
    let q;
    if (profile.role === 'worker' && (profile as any).workerId) {
      q = query(collection(db, 'bookings'), where('workerId', '==', (profile as any).workerId), limit(10));
    } else {
      q = query(collection(db, 'bookings'), where('customerId', '==', profile.uid), limit(10));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chats = snapshot.docs.map(doc => doc.data() as Booking);
      setRecentChats(chats.sort((a, b) => {
        const timeA = a.lastMessageTimestamp || a.timestamp;
        const timeB = b.lastMessageTimestamp || b.timestamp;
        return timeB - timeA;
      }));
    }, (error) => {
      console.error("App: recentChats snapshot error", error);
    });
    return () => unsubscribe();
  }, [profile]);

  useEffect(() => {
    if (recentChats.length === 0) return;

    const fetchMissingProfiles = async () => {
      const missingUids = new Set<string>();
      recentChats.forEach(b => {
        missingUids.add(b.customerId);
        missingUids.add(b.workerId);
      });

      const newProfiles = { ...profilesCache };
      let updated = false;

      for (const uid of missingUids) {
        if (!newProfiles[uid]) {
          try {
            let userSnap = await getDoc(doc(db, 'users', uid));
            if (userSnap.exists()) {
              newProfiles[uid] = { 
                name: userSnap.data().name, 
                photoURL: userSnap.data().photoURL 
              };
              updated = true;
            } else {
              let workerSnap = await getDoc(doc(db, 'workers', uid));
              if (workerSnap.exists()) {
                newProfiles[uid] = { 
                  name: workerSnap.data().name, 
                  photoURL: workerSnap.data().photoURL 
                };
                updated = true;
              }
            }
          } catch (e) {
            console.error("Error fetching profile for", uid, e);
          }
        }
      }

      if (updated) {
        setProfilesCache(newProfiles);
      }
    };

    fetchMissingProfiles();
  }, [recentChats]);

  const whatsappUrl = `https://wa.me/${settings.becomeWorkerWhatsappNumber || settings.whatsappNumber}?text=${encodeURIComponent(settings.becomeWorkerWhatsappMessage || t('whatsappMessage'))}`;

  return (
    <div className="pb-20 p-4 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-primary">{t('appName')}</h2>
          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{profile?.city}</p>
        </div>
        <div className="flex items-center gap-2">
          {profile?.role === 'worker' && myRequests.length > 0 && (
            <div className="relative">
              <Bell className="text-primary animate-bounce" size={24} />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {myRequests.length}
              </span>
            </div>
          )}
          <button 
            onClick={() => navigate('/profile')}
            className="p-2 bg-white dark:bg-gray-800 shadow-sm text-primary rounded-full hover:bg-primary/10 transition-all border border-gray-100 dark:border-gray-700"
          >
            <MessageSquare size={20} />
          </button>
          {settings.useInternalApplications ? (
            <Link 
              to="/apply"
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full text-[10px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <MessageCircle size={16} />
              {t('becomeWorker').toUpperCase()}
            </Link>
          ) : (
            <a 
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full text-[10px] font-black shadow-lg hover:scale-105 active:scale-95 transition-all"
            >
              <MessageCircle size={16} />
              {t('becomeWorker').toUpperCase()}
            </a>
          )}
        </div>
      </div>

      <AdsCarousel ads={ads} />

      {/* Categories Grid - Main Focus */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black tracking-tight">{t('categories')}</h2>
        </div>
        <div className="grid grid-cols-4 gap-3">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => navigate(`/category/${cat.id}`)}
              className="flex flex-col items-center p-2 rounded-2xl transition-all border-2 aspect-square justify-center bg-white dark:bg-gray-800 border-transparent shadow-sm hover:border-primary/30 active:scale-95"
            >
              <span className="text-2xl mb-1">{cat.icon}</span>
              <span className="text-[9px] font-black text-center leading-tight line-clamp-2 px-1 text-gray-700 dark:text-gray-300">
                {(i18n.language === 'ar' ? cat.nameAr : i18n.language === 'ku' ? cat.nameKu : cat.nameEn).toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {recentChats.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
            <MessageSquare className="text-primary" size={20} />
            {t('recentChats')}
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {recentChats.map((chat) => {
              const targetId = profile?.role === 'worker' ? chat.customerId : chat.workerId;
              const targetProfile = profilesCache[targetId];
              
              return (
                <div 
                  key={chat.id}
                  onClick={() => navigate(`/chat/${chat.id}`)}
                  className="min-w-[180px] bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 shadow-sm cursor-pointer hover:border-primary/30 active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {targetProfile?.photoURL ? (
                      <img src={targetProfile.photoURL} alt={targetProfile.name} className="w-8 h-8 rounded-full object-cover border border-primary/20" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-black">
                        {targetProfile?.name?.charAt(0) || '?'}
                      </div>
                    )}
                    <div className="overflow-hidden">
                      <p className="text-[10px] font-black truncate">
                        {profile?.role === 'admin' ? (chat.customerName || profilesCache[chat.customerId]?.name || chat.customerId.substring(0, 8)) : t(chat.category)}
                      </p>
                      <span className="text-[8px] px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded-full w-fit font-bold uppercase text-gray-500">
                        {t(chat.status)}
                      </span>
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-500 line-clamp-1 font-medium">
                    {chat.lastMessage ? chat.lastMessage : chat.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {profile?.role === 'worker' && myRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-black tracking-tight mb-4 flex items-center gap-2">
            <Briefcase className="text-primary" size={20} />
            {t('newRequests')}
          </h2>
          <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {myRequests.map((req) => (
              <div 
                key={req.id}
                onClick={() => navigate(`/chat/${req.id}`)}
                className="min-w-[220px] bg-primary/5 border border-primary/20 rounded-2xl p-4 shadow-sm cursor-pointer hover:bg-primary/10 active:scale-95 transition-colors"
              >
                <div className="flex items-center gap-3 mb-3">
                  {profilesCache[req.customerId]?.photoURL ? (
                    <img src={profilesCache[req.customerId].photoURL} alt={profilesCache[req.customerId].name} className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-black">
                      {profilesCache[req.customerId]?.name?.charAt(0) || '?'}
                    </div>
                  )}
                  <div>
                    <p className="text-[11px] font-black">{profilesCache[req.customerId]?.name || req.customerName || req.customerId.substring(0, 8)}</p>
                    <span className="text-[8px] font-black uppercase text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                      {t(req.category)}
                    </span>
                  </div>
                </div>
                <p className="text-xs font-bold line-clamp-1 mb-1">{req.description}</p>
                {req.locationDescription && (
                  <p className="text-[10px] text-gray-500 font-medium line-clamp-1 mb-2 flex items-center gap-1">
                    <Info size={10} className="flex-shrink-0" />
                    <span>{req.locationDescription}</span>
                  </p>
                )}
                <div className="mb-3">
                  <input 
                    type="text"
                    id={`home-time-${req.id}`}
                    placeholder={t('enterScheduledTime')}
                    className="w-full text-[10px] p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-1 focus:ring-primary outline-none"
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className="flex gap-2">
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        const timeInput = document.getElementById(`home-time-${req.id}`) as HTMLInputElement;
                        if (!timeInput.value) return;
                        await updateDoc(doc(db, 'bookings', req.id), {
                          status: 'confirmed',
                          scheduledTime: timeInput.value
                        });
                      }}
                      className="px-3 py-1.5 bg-green-500 text-white text-[9px] rounded-lg font-black shadow-sm"
                    >
                      {t('accept').toUpperCase()}
                    </button>
                    <button 
                      onClick={async (e) => {
                        e.stopPropagation();
                        setConfirmData({ isOpen: true, bookingId: req.id });
                      }}
                      className="px-3 py-1.5 bg-red-500 text-white text-[9px] rounded-lg font-black shadow-sm"
                    >
                      {t('deny').toUpperCase()}
                    </button>
                  </div>
                  <div className="p-2 bg-primary text-white rounded-full shadow-sm">
                    <MessageSquare size={14} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={!!confirmData?.isOpen}
        title={t('confirmDeny')}
        message={t('confirmDeny')}
        onConfirm={async () => {
          if (confirmData?.bookingId) {
            await updateDoc(doc(db, 'bookings', confirmData.bookingId), {
              status: 'denied'
            });
          }
          setConfirmData(null);
        }}
        onCancel={() => setConfirmData(null)}
        confirmText={t('deny')}
        cancelText={t('cancel')}
      />
      <Alert 
        isOpen={!!alertData?.isOpen}
        title={alertData?.title || ''}
        message={alertData?.message || ''}
        type={alertData?.type || 'info'}
        onClose={() => setAlertData(null)}
      />
    </div>
  );
};

const BookingPage = () => {
  const { t } = useTranslation();
  const { workerId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [locationDescription, setLocationDescription] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [sending, setSending] = useState(false);
  const [alertData, setAlertData] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (!workerId) return;
    const fetchWorker = async () => {
      try {
        const docRef = doc(db, 'workers', workerId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setWorker(docSnap.data() as WorkerProfile);
        }
      } catch (error) {
        console.error("Error fetching worker:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchWorker();
  }, [workerId]);

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !worker || !description || !locationDescription) {
      if (!description) setAlertData({ isOpen: true, title: t('error'), message: t('enterDescription'), type: 'error' });
      else if (!locationDescription) setAlertData({ isOpen: true, title: t('error'), message: t('enterLocationDescription'), type: 'error' });
      return;
    }

    if (worker.isAvailable === false) {
      setAlertData({ isOpen: true, title: t('error'), message: t('workerUnavailable'), type: 'error' });
      return;
    }

    setSending(true);
    try {
      // Check for pending bookings limit
      const pendingQuery = query(
        collection(db, 'bookings'),
        where('customerId', '==', profile.uid),
        where('status', '==', 'pending')
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      
      if (pendingSnapshot.size >= 2) {
        setAlertData({ 
          isOpen: true, 
          title: t('error'), 
          message: t('pendingLimitReached'), 
          type: 'error' 
        });
        setSending(false);
        return;
      }

      const bookingId = Math.random().toString(36).substr(2, 9);
      await setDoc(doc(db, 'bookings', bookingId), {
        id: bookingId,
        customerId: profile.uid,
        customerEmail: profile.email,
        customerName: profile.name,
        customerPhone: profile.phone,
        workerId: worker.uid,
        workerEmail: worker.email,
        workerName: worker.name,
        workerPhone: worker.phone,
        status: 'pending',
        timestamp: Date.now(),
        category: worker.profession,
        city: worker.city,
        description,
        location,
        locationDescription,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {})
      });
      setAlertData({ 
        isOpen: true, 
        title: t('success'), 
        message: t('bookingSuccess'), 
        type: 'success' 
      });
      setTimeout(() => navigate('/profile'), 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'bookings');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><LoadingScreen /></div>;
  if (!worker) return <div className="text-center py-12">{t('noWorkers')}</div>;

  return (
    <div className="max-w-md mx-auto p-6">
      <Alert 
        isOpen={!!alertData?.isOpen}
        title={alertData?.title || ''}
        message={alertData?.message || ''}
        type={alertData?.type || 'info'}
        onClose={() => setAlertData(null)}
      />
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">{t('bookingRequest')}</h1>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 border border-gray-100 dark:border-gray-700 mb-6">
        <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100 dark:border-gray-700">
          {worker.photoURL ? (
            <img src={worker.photoURL} alt={worker.name} className="w-16 h-16 rounded-2xl object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl">👤</div>
          )}
          <div>
            <h2 className="font-bold text-lg">{worker.name}</h2>
            <p className="text-primary text-sm font-medium">{t(worker.profession)}</p>
            {worker.specialties && worker.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {worker.specialties.map(s => (
                  <span key={s} className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-[8px] font-bold uppercase">
                    {t(s)}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleBooking} className="space-y-6">
          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
              {t('requestDescription')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('requestDescription')}
              className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-primary h-32 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
              {t('yourLocation')} <span className="text-xs font-normal text-gray-400">({t('optional')})</span>
            </label>
            <div className="flex flex-col gap-2">
              {coords ? (
                <a 
                  href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full p-4 flex items-center gap-3 rounded-2xl border-2 transition-all bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:scale-[1.01]"
                >
                  <MapPin className="text-green-500" size={20} />
                  <div className="flex flex-col">
                    <span className="text-sm text-green-700 dark:text-green-300 font-bold">
                      {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                    </span>
                    <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">{t('clickToVerify')}</span>
                  </div>
                </a>
              ) : (
                <div className="w-full p-4 flex items-center gap-3 rounded-2xl border-2 transition-all bg-gray-50 dark:bg-gray-900 border-transparent">
                  <MapPin className="text-gray-400" size={20} />
                  <span className="text-sm text-gray-400 italic">{t('locationNotSet')}</span>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  if (!navigator.geolocation) {
                    setAlertData({ isOpen: true, title: t('error'), message: t('geoNotSupported'), type: 'error' });
                    return;
                  }
                  setGettingLocation(true);
                  navigator.geolocation.getCurrentPosition(
                    (position) => {
                      const { latitude, longitude } = position.coords;
                      setCoords({ lat: latitude, lng: longitude });
                      setLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
                      setGettingLocation(false);
                    },
                    (error) => {
                      console.error("Error getting location:", error);
                      setAlertData({ isOpen: true, title: t('error'), message: t('geoError'), type: 'error' });
                      setGettingLocation(false);
                    }
                  );
                }}
                disabled={gettingLocation}
                className="flex items-center gap-2 text-xs font-bold text-primary hover:underline w-fit"
              >
                {gettingLocation ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Clock size={14} /></motion.div>
                ) : <MapPin size={14} />}
                {t('useCurrentLocation')}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-2 text-gray-700 dark:text-gray-300">
              {t('locationDescription')}
            </label>
            <input
              type="text"
              required
              value={locationDescription}
              onChange={(e) => setLocationDescription(e.target.value)}
              placeholder={t('locationDescription')}
              className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={sending}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {sending ? <LoadingScreen /> : <><Calendar size={20} /> {t('sendRequest')}</>}
          </button>
        </form>
      </div>
    </div>
  );
};

const RatingModal = ({ isOpen, onClose, onSubmit, workerName }: { isOpen: boolean; onClose: () => void; onSubmit: (rating: number, review: string) => void; workerName: string }) => {
  const { t } = useTranslation();
  const [rating, setRating] = useState(5);
  const [review, setReview] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
      >
        <h3 className="text-xl font-bold mb-2">{t('rateWorker')}</h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{workerName}</p>
        
        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button 
              key={star} 
              onClick={() => setRating(star)}
              className="focus:outline-none transition-transform hover:scale-110"
            >
              <Star 
                size={32} 
                fill={star <= rating ? "#EAB308" : "none"} 
                className={star <= rating ? "text-yellow-500" : "text-gray-300"} 
              />
            </button>
          ))}
        </div>

        <textarea
          value={review}
          onChange={(e) => setReview(e.target.value)}
          placeholder={t('writeReview')}
          className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-primary h-32 resize-none mb-6 text-sm"
        />

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-sm"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={() => onSubmit(rating, review)}
            className="flex-1 py-3 bg-primary text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20"
          >
            {t('submitRating')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ReportModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  reportedName, 
  reporterRole 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (reason: string, details: string) => void; 
  reportedName: string;
  reporterRole: string;
}) => {
  const { t } = useTranslation();
  const [reason, setReason] = useState('reason_unprofessional');
  const [details, setDetails] = useState('');

  const workerReasons = [
    { id: 'reason_unprofessional', label: t('reason_unprofessional') },
    { id: 'reason_no_show_customer', label: t('reason_no_show_customer') },
    { id: 'reason_payment_issue', label: t('reason_payment_issue') },
    { id: 'reason_incorrect_location', label: t('reason_incorrect_location') },
    { id: 'reason_rude_behavior', label: t('reason_rude_behavior') },
    { id: 'reason_unsafe_environment', label: t('reason_unsafe_environment') },
    { id: 'reason_scope_change', label: t('reason_scope_change') },
    { id: 'reason_harassment', label: t('reason_harassment') },
    { id: 'reason_other', label: t('reason_other') }
  ];

  const customerReasons = [
    { id: 'reason_unprofessional', label: t('reason_unprofessional') },
    { id: 'reason_no_show_worker', label: t('reason_no_show_worker') },
    { id: 'reason_poor_quality', label: t('reason_poor_quality') },
    { id: 'reason_overcharging', label: t('reason_overcharging') },
    { id: 'reason_rude_behavior', label: t('reason_rude_behavior') },
    { id: 'reason_harassment', label: t('reason_harassment') },
    { id: 'reason_other', label: t('reason_other') }
  ];

  const reportReasons = reporterRole === 'worker' ? workerReasons : customerReasons;

  useEffect(() => {
    if (isOpen) {
      setReason(reportReasons[0].id);
      setDetails('');
    }
  }, [isOpen, reporterRole]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-6 w-full max-w-sm shadow-2xl"
      >
        <div className="flex items-center gap-2 mb-4 text-red-500">
          <Flag size={24} />
          <h3 className="text-xl font-bold">{t('reportIssue')}</h3>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
          {t('reporting')}: <span className="font-bold text-gray-900 dark:text-white">{reportedName}</span>
        </p>
        
        <div className="space-y-3 mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">{t('reason')}</label>
          <select 
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-primary text-sm"
          >
            {reportReasons.map(r => (
              <option key={r.id} value={r.id}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3 mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">{t('details')}</label>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder={t('provideMoreDetails')}
            className="w-full p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-none focus:ring-2 focus:ring-primary h-32 resize-none text-sm"
            required
          />
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-sm"
          >
            {t('cancel')}
          </button>
          <button 
            onClick={() => onSubmit(reason, details)}
            disabled={!details.trim()}
            className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-red-500/20 disabled:opacity-50"
          >
            {t('submitReport')}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ProfilePage = () => {
  const { t, i18n } = useTranslation();
  const { profile } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [workerData, setWorkerData] = useState<WorkerProfile | null>(null);
  const [now, setNow] = useState(Date.now());
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(profile?.name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [city, setCity] = useState<City>(profile?.city || 'Baghdad');
  const [confirmData, setConfirmData] = useState<{ isOpen: boolean; bookingId: string } | null>(null);
  const [ratingData, setRatingData] = useState<{ isOpen: boolean; booking: Booking | null }>({ isOpen: false, booking: null });
  const [reportData, setReportData] = useState<{ isOpen: boolean; booking: Booking | null }>({ isOpen: false, booking: null });
  const [alertData, setAlertData] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [cancelBookingData, setCancelBookingData] = useState<{ isOpen: boolean; bookingId: string } | null>(null);
  const [profilesCache, setProfilesCache] = useState<Record<string, { name: string; photoURL?: string; phone?: string }>>({});
  const [userReports, setUserReports] = useState<Report[]>([]);
  const [application, setApplication] = useState<WorkerApplication | null>(null);
  const [toggling, setToggling] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    // Check file size (limit to 1MB for base64 storage)
    if (file.size > 1024 * 1024) {
      setAlertData({ 
        isOpen: true, 
        title: t('error'), 
        message: t('fileTooLarge'), 
        type: 'error' 
      });
      return;
    }

    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        
        // Update user profile
        await updateDoc(doc(db, 'users', profile.uid), {
          photoURL: base64String
        });

        // If user is a worker, update worker profile too
        if (profile.role === 'worker' && (profile as any).workerId) {
          await updateDoc(doc(db, 'workers', (profile as any).workerId), {
            photoURL: base64String
          });
        }

        setAlertData({ 
          isOpen: true, 
          title: t('success'), 
          message: t('photoUpdated'), 
          type: 'success' 
        });
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error uploading photo:", error);
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (profile?.role === 'worker' && (profile as any).workerId) {
      const unsubscribe = onSnapshot(doc(db, 'workers', (profile as any).workerId), (docSnap) => {
        if (docSnap.exists()) {
          setWorkerData(docSnap.data() as WorkerProfile);
        }
      }, (error) => {
        console.error("App: workerData profile editor snapshot error", error);
      });
      return () => unsubscribe();
    }
  }, [profile]);

  const handleToggleAvailability = async () => {
    if (!workerData || toggling) return;
    setToggling(true);
    try {
      await updateDoc(doc(db, 'workers', workerData.uid), {
        isAvailable: workerData.isAvailable === false
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'workers');
    } finally {
      setToggling(false);
    }
  };

  useEffect(() => {
    if ((profile?.role !== 'admin' && profile?.role !== 'worker') || bookings.length === 0) return;

    const fetchMissingProfiles = async () => {
      const missingUids = new Set<string>();
      bookings.forEach(b => {
        if (!b.customerName || !b.customerPhone) missingUids.add(b.customerId);
        if (!b.workerName || !b.workerPhone) missingUids.add(b.workerId);
      });

      const newProfiles = { ...profilesCache };
      let updated = false;

      for (const uid of missingUids) {
        if (!newProfiles[uid]) {
          try {
            // Check users collection first
            let userSnap = await getDoc(doc(db, 'users', uid));
            if (userSnap.exists()) {
              newProfiles[uid] = { 
                name: userSnap.data().name, 
                photoURL: userSnap.data().photoURL,
                phone: userSnap.data().phone
              };
              updated = true;
            } else {
              // Check workers collection
              let workerSnap = await getDoc(doc(db, 'workers', uid));
              if (workerSnap.exists()) {
                newProfiles[uid] = { 
                  name: workerSnap.data().name, 
                  photoURL: workerSnap.data().photoURL,
                  phone: workerSnap.data().phone
                };
                updated = true;
              }
            }
          } catch (e) {
            console.error("Error fetching profile for", uid, e);
          }
        }
      }

      if (updated) {
        setProfilesCache(newProfiles);
      }
    };

    fetchMissingProfiles();
  }, [bookings, profile?.role]);

  useEffect(() => {
    if (!profile) return;
    
    let q;
    if (profile.role === 'admin') {
      // Admin sees all bookings in their city
      q = query(collection(db, 'bookings'), where('city', '==', profile.city));
    } else if (profile.role === 'worker' && (profile as any).workerId) {
      // Worker sees bookings assigned to them
      q = query(collection(db, 'bookings'), where('workerId', '==', (profile as any).workerId));
    } else {
      // Regular user sees their own bookings
      q = query(collection(db, 'bookings'), where('customerId', '==', profile.uid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setBookings(snapshot.docs.map(doc => doc.data() as Booking).sort((a, b) => b.timestamp - a.timestamp));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'bookings');
    });

    // Fetch user's reports
    const reportsQ = query(collection(db, 'reports'), where('reporterId', '==', profile.uid));
    const unsubscribeReports = onSnapshot(reportsQ, (snapshot) => {
      setUserReports(snapshot.docs.map(doc => doc.data() as Report));
    }, (error) => {
      console.error("App: userReports snapshot error", error);
    });

    let unsubscribeApp: (() => void) | undefined;
    if (profile.role !== 'worker' && profile.role !== 'admin') {
      unsubscribeApp = onSnapshot(doc(db, 'workerApplications', profile.uid), (docSnap) => {
        if (docSnap.exists()) {
          setApplication(docSnap.data() as WorkerApplication);
        }
      }, (error) => {
        console.error("App: workerApplication snapshot error", error);
      });
    }

    return () => {
      unsubscribe();
      unsubscribeReports();
      if (unsubscribeApp) unsubscribeApp();
    };
  }, [profile]);

  const handleUpdateProfile = async () => {
    if (!profile) return;
    // Don't allow changing phone number if it's already set
    const updateData = { ...profile, name, city };
    if (!profile.phone) {
      (updateData as any).phone = phone;
    }
    await setDoc(doc(db, 'users', profile.uid), updateData, { merge: true });
    setIsEditing(false);
  };

  const handleReport = async (reason: string, details: string) => {
    if (!profile || !reportData.booking) return;

    // Check if already reported
    const alreadyReported = userReports.some(r => r.bookingId === reportData.booking?.id);
    if (alreadyReported) {
      setAlertData({
        isOpen: true,
        title: t('error'),
        message: t('alreadyReported'),
        type: 'error'
      });
      setReportData({ isOpen: false, booking: null });
      return;
    }

    try {
      const reportId = `${profile.uid}_${reportData.booking.id}`;
      const isWorkerReporting = profile.role === 'worker';
      const reportedId = isWorkerReporting ? reportData.booking.customerId : reportData.booking.workerId;

      await setDoc(doc(db, 'reports', reportId), {
        id: reportId,
        bookingId: reportData.booking.id,
        reporterId: profile.uid,
        reportedId,
        reason,
        details,
        timestamp: Date.now(),
        status: 'pending',
        language: i18n.language
      });

      setAlertData({
        isOpen: true,
        title: t('success'),
        message: t('reportSubmitted'),
        type: 'success'
      });
    } catch (error) {
      console.error("Error submitting report:", error);
      setAlertData({
        isOpen: true,
        title: t('error'),
        message: t('reportError'),
        type: 'error'
      });
    } finally {
      setReportData({ isOpen: false, booking: null });
    }
  };

  const handleRateWorker = async (rating: number, review: string) => {
    if (!ratingData.booking || !profile) return;
    try {
      const booking = ratingData.booking;
      const reviewId = doc(collection(db, 'reviews')).id;
      
      await updateDoc(doc(db, 'bookings', booking.id), {
        rating,
        review
      });
      
      // Create a dedicated review document
      await setDoc(doc(db, 'reviews', reviewId), {
        id: reviewId,
        bookingId: booking.id,
        workerId: booking.workerId,
        customerId: profile.uid,
        customerName: profile.name,
        customerPhoto: profile.photoURL || '',
        rating,
        comment: review,
        timestamp: Date.now()
      });
      
      // Calculate average rating
      const reviewsQuery = query(collection(db, 'reviews'), where('workerId', '==', booking.workerId));
      const reviewsSnapshot = await getDocs(reviewsQuery);
      const allReviews = reviewsSnapshot.docs.map(d => d.data() as Review);
      
      // Include the new review in case it's not in the snapshot yet
      const currentRatings = allReviews.map(r => r.rating);
      if (!allReviews.find(r => r.id === reviewId)) {
        currentRatings.push(rating);
      }
      
      const totalRating = currentRatings.reduce((acc, curr) => acc + curr, 0);
      const averageRating = Number((totalRating / currentRatings.length).toFixed(1));

      await updateDoc(doc(db, 'workers', booking.workerId), {
        rating: averageRating 
      });

      setRatingData({ isOpen: false, booking: null });
      setAlertData({ isOpen: true, title: t('success'), message: t('ratingSuccess'), type: 'success' });
    } catch (error) {
      console.error("Error rating worker:", error);
      setAlertData({ 
        isOpen: true, 
        title: t('error'), 
        message: error instanceof Error ? error.message : t('error'), 
        type: 'error' 
      });
    }
  };

  return (
    <div className="pb-20 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16" />
        
        <div className="flex flex-col items-center relative z-10">
          <div className="relative mb-4">
            {profile?.photoURL ? (
              <img src={profile.photoURL} alt={profile.name} className="w-24 h-24 rounded-full border-4 border-primary shadow-lg object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                {profile?.name?.charAt(0)}
              </div>
            )}
            {profile?.role === 'worker' && workerData && (
              <div className={cn(
                "absolute top-0 right-0 w-6 h-6 rounded-full border-4 border-white dark:border-gray-800 shadow-sm",
                workerData.isAvailable !== false ? "bg-green-500" : "bg-red-500"
              )} />
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handlePhotoUpload} 
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 p-2 bg-white dark:bg-gray-700 rounded-full shadow-md border border-gray-100 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <Camera size={16} className="text-primary" />
              )}
            </button>
          </div>

          {isEditing ? (
            <div className="w-full space-y-3">
              <input 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                placeholder={t('name')}
              />
              <select 
                value={city} 
                onChange={(e) => setCity(e.target.value as City)}
                className="w-full px-4 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600"
              >
                {IRAQI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={handleUpdateProfile} className="flex-1 py-2 bg-primary text-white rounded-lg font-bold">{t('save')}</button>
                <button onClick={() => setIsEditing(false)} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-bold">{t('cancel')}</button>
              </div>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold">{profile?.name}</h2>
              <div className="flex flex-col items-center gap-1 mb-1">
                <p className="text-gray-500 flex items-center gap-1">{profile?.city}</p>
                <p className="text-gray-500 flex items-center gap-1">
                  <Phone size={14} /> {profile?.phone}
                </p>
              </div>
              <div className="flex items-center gap-2 mb-4">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  profile?.role === 'admin' ? "bg-purple-100 text-purple-700" : 
                  profile?.role === 'worker' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                )}>
                  {profile?.role}
                </span>
                {profile?.role === 'worker' && (
                  <span className="text-[10px] text-gray-400 font-mono">ID: {(profile as any).workerId?.substring(0, 8)}...</span>
                )}
              </div>

              {profile?.role === 'worker' && workerData && (
                <div className="w-full mb-4 px-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-3 h-3 rounded-full animate-pulse",
                        workerData.isAvailable !== false ? "bg-green-500" : "bg-red-500"
                      )} />
                      <div>
                        <p className="text-sm font-bold">{workerData.isAvailable !== false ? t('available') : t('unavailable')}</p>
                        <p className="text-[10px] text-gray-500">{workerData.isAvailable !== false ? t('youAreAvailableNow') : t('youAreUnavailableNow')}</p>
                      </div>
                    </div>
                    <button 
                      onClick={handleToggleAvailability}
                      disabled={toggling}
                      className={cn(
                        "w-14 h-7 rounded-full transition-all relative shadow-inner",
                        workerData.isAvailable !== false ? "bg-green-500" : "bg-gray-300 dark:bg-gray-700"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow-md flex items-center justify-center",
                        workerData.isAvailable !== false ? "translate-x-8" : "translate-x-1"
                      )}>
                        {toggling && <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />}
                      </div>
                    </button>
                  </div>
                </div>
              )}

              {application && profile?.role !== 'worker' && (
                <div className="w-full mb-6 px-4">
                  <div className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between shadow-sm",
                    application.status === 'pending' ? "bg-yellow-50 border-yellow-100 text-yellow-800" :
                    application.status === 'approved' ? "bg-green-50 border-green-100 text-green-800" :
                    "bg-red-50 border-red-100 text-red-800"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-full",
                        application.status === 'pending' ? "bg-yellow-100" :
                        application.status === 'approved' ? "bg-green-100" : "bg-red-100"
                      )}>
                        <FileText size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider">{t('applicationStatus')}</p>
                        <p className="text-sm font-medium">{t(application.status)}</p>
                      </div>
                    </div>
                    {application.status === 'rejected' && (
                      <Link to="/apply" className="text-xs font-bold underline">{t('applyAgain')}</Link>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap justify-center gap-2">
                <button 
                  onClick={() => setIsEditing(true)}
                  className="px-6 py-2 border-2 border-primary text-primary rounded-full font-bold hover:bg-primary hover:text-white transition-all"
                >
                  {t('editProfile')}
                </button>
                {profile?.role === 'admin' && (
                  <Link 
                    to="/admin"
                    className="px-6 py-2 bg-primary text-white rounded-full font-bold shadow-lg hover:scale-105 transition-all flex items-center gap-2"
                  >
                    <ShieldCheck size={18} /> {t('adminDashboard')}
                  </Link>
                )}
              </div>
              {profile?.role === 'worker' && (
                <div className="mt-6 w-full flex gap-4">
                  <button className="flex-1 bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl text-center border border-green-100 dark:border-green-800 shadow-sm hover:scale-[1.02] transition-transform">
                    <p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase mb-1">{t('completed')}</p>
                    <p className="text-2xl font-black text-green-700 dark:text-green-300">
                      {bookings.filter(b => b.status === 'completed').length}
                    </p>
                  </button>
                  <button className="flex-1 bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl text-center border border-red-100 dark:border-red-800 shadow-sm hover:scale-[1.02] transition-transform">
                    <p className="text-xs text-red-600 dark:text-red-400 font-bold uppercase mb-1">{t('denied')}</p>
                    <p className="text-2xl font-black text-red-700 dark:text-red-300">
                      {bookings.filter(b => b.status === 'denied').length}
                    </p>
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Calendar size={20} /> {t('bookings')}</h3>
      <div className="space-y-4">
        {(() => {
          const filtered = bookings.filter((b) => profile?.role !== 'admin' || (now - b.timestamp < 24 * 60 * 60 * 1000));
          if (filtered.length === 0) {
            return <div className="text-center py-8 text-gray-500 italic">No bookings yet.</div>;
          }
          return filtered.map((booking) => (
            <div key={booking.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md border-l-4 border-primary flex gap-4">
              <div className="flex-shrink-0">
                {(() => {
                  const targetId = profile?.role === 'worker' ? booking.customerId : booking.workerId;
                  const targetProfile = profilesCache[targetId];
                  return targetProfile?.photoURL ? (
                    <img src={targetProfile.photoURL} alt={targetProfile.name} className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      {targetProfile?.name?.charAt(0) || '?'}
                    </div>
                  );
                })()}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-lg">
                    {profile?.role === 'admin' ? (
                      <span className="flex flex-col">
                        <span>{booking.customerName || profilesCache[booking.customerId]?.name || booking.customerId.substring(0, 8)}</span>
                        <span className="text-xs text-primary font-medium">{t('requesting')} {t(booking.category)}</span>
                      </span>
                    ) : (profile?.role === 'worker' ? (
                      <span className="flex flex-col">
                        <span>{booking.customerName || profilesCache[booking.customerId]?.name || booking.customerId.substring(0, 8)}</span>
                        <a 
                          href={`tel:${booking.customerPhone || profilesCache[booking.customerId]?.phone}`}
                          className="text-xs text-primary font-bold flex items-center gap-1 hover:underline"
                        >
                          <Phone size={10} /> {booking.customerPhone || profilesCache[booking.customerId]?.phone}
                        </a>
                      </span>
                    ) : t(booking.category))}
                  </p>
                  <p className="text-xs text-gray-500">{new Date(booking.timestamp).toLocaleDateString()}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">{booking.description}</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin size={12} /> 
                      {booking.lat && booking.lng ? (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${booking.lat},${booking.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary font-bold hover:underline"
                        >
                          {booking.location}
                        </a>
                      ) : booking.location}
                    </p>
                    {booking.locationDescription && (
                      <p className="text-xs text-gray-600 dark:text-gray-400 font-medium flex items-start gap-1">
                        <Info size={12} className="mt-0.5 flex-shrink-0" />
                        <span>{booking.locationDescription}</span>
                      </p>
                    )}
                    {booking.scheduledTime && (
                      <p className="text-xs text-primary font-bold flex items-center gap-1">
                        {booking.status === 'confirmed' && <Pin size={12} className="fill-primary" />}
                        <Clock size={12} /> {booking.scheduledTime}
                      </p>
                    )}
                  </div>
                  {profile?.role === 'admin' && (
                    <div className="mt-2 flex flex-col gap-1 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-xl">
                      <p className="text-[10px] text-gray-700 dark:text-gray-300 font-bold flex items-center gap-1">
                        <User size={10} className="text-primary" /> {t('customer')}: {booking.customerName || profilesCache[booking.customerId]?.name || booking.customerId}
                      </p>
                      <p className="text-[10px] text-gray-700 dark:text-gray-300 font-bold flex items-center gap-1">
                        <Briefcase size={10} className="text-primary" /> {t('worker')}: {booking.workerName || profilesCache[booking.workerId]?.name || booking.workerId}
                      </p>
                    </div>
                  )}
                  {booking.status === 'cancelled' && booking.cancellationReason && (
                    <p className="text-[10px] text-red-500 font-bold mt-1">
                      {t('cancellationReason')}: {t(booking.cancellationReason)}
                    </p>
                  )}
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                  booking.status === 'confirmed' ? "bg-green-100 text-green-700" : 
                  booking.status === 'pending' ? "bg-yellow-100 text-yellow-700" : 
                  booking.status === 'completed' ? "bg-blue-100 text-blue-700" : 
                  booking.status === 'denied' ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                )}>
                  {t(booking.status)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-4">
                <div className="flex gap-2">
                  {profile?.role === 'user' && (booking.status === 'pending' || booking.status === 'confirmed') && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setCancelBookingData({ isOpen: true, bookingId: booking.id });
                      }}
                      className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg font-bold flex items-center gap-1"
                    >
                      <X size={12} /> {t('cancelBooking')}
                    </button>
                  )}
                  {profile?.role === 'worker' && booking.status === 'pending' && (
                    <div className="flex flex-col gap-2 w-full">
                      <input 
                        type="text"
                        className="text-xs p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 focus:ring-1 focus:ring-primary outline-none"
                        id={`time-${booking.id}`}
                        placeholder={t('enterScheduledTime')}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex gap-2">
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            const timeInput = document.getElementById(`time-${booking.id}`) as HTMLInputElement;
                            if (!timeInput.value) return;
                            await updateDoc(doc(db, 'bookings', booking.id), {
                              status: 'confirmed',
                              scheduledTime: timeInput.value
                            });
                          }}
                          className="flex-1 py-1.5 bg-green-500 text-white text-xs rounded-lg font-bold shadow-sm"
                        >
                          {t('accept')}
                        </button>
                        <button 
                          onClick={async (e) => {
                            e.stopPropagation();
                            setConfirmData({ isOpen: true, bookingId: booking.id });
                          }}
                          className="flex-1 py-1.5 bg-red-500 text-white text-xs rounded-lg font-bold shadow-sm"
                        >
                          {t('deny')}
                        </button>
                      </div>
                    </div>
                  )}
                  {profile?.role === 'worker' && booking.status === 'confirmed' && (
                    <button 
                      onClick={async () => {
                        await updateDoc(doc(db, 'bookings', booking.id), {
                          status: 'completed'
                        });
                      }}
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded-lg font-bold"
                    >
                      {t('finish')}
                    </button>
                  )}
                  {profile?.role === 'user' && booking.status === 'completed' && !booking.rating && (
                    <button 
                      onClick={() => setRatingData({ isOpen: true, booking })}
                      className="px-3 py-1 bg-yellow-500 text-white text-xs rounded-lg font-bold flex items-center gap-1"
                    >
                      <Star size={12} fill="white" /> {t('rate')}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link to={`/chat/${booking.id}`} className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors">
                    <MessageSquare size={20} />
                  </Link>
                  <button 
                    onClick={() => setReportData({ isOpen: true, booking })}
                    disabled={userReports.some(r => r.bookingId === booking.id)}
                    className={cn(
                      "p-2 rounded-lg transition-colors",
                      userReports.some(r => r.bookingId === booking.id) 
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                        : "bg-red-50 text-red-500 hover:bg-red-100"
                    )}
                    title={userReports.some(r => r.bookingId === booking.id) ? t('alreadyReported') : t('report')}
                  >
                    <Flag size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ));
        })()}
      </div>

      <ConfirmDialog 
        isOpen={!!confirmData?.isOpen}
        title={t('confirmDeny')}
        message={t('confirmDeny')}
        onConfirm={async () => {
          if (confirmData?.bookingId) {
            await updateDoc(doc(db, 'bookings', confirmData.bookingId), {
              status: 'denied'
            });
          }
          setConfirmData(null);
        }}
        onCancel={() => setConfirmData(null)}
        confirmText={t('deny')}
        cancelText={t('cancel')}
      />
      <Alert 
        isOpen={!!alertData?.isOpen}
        title={alertData?.title || ''}
        message={alertData?.message || ''}
        type={alertData?.type || 'info'}
        onClose={() => setAlertData(null)}
      />
      <RatingModal 
        isOpen={ratingData.isOpen}
        onClose={() => setRatingData({ isOpen: false, booking: null })}
        onSubmit={handleRateWorker}
        workerName={ratingData.booking?.workerName || ''}
      />
      <ReportModal 
        isOpen={reportData.isOpen}
        onClose={() => setReportData({ isOpen: false, booking: null })}
        onSubmit={handleReport}
        reportedName={profile?.role === 'worker' ? (reportData.booking?.customerName || '') : (reportData.booking?.workerName || '')}
        reporterRole={profile?.role || 'user'}
      />
      <CancelBookingDialog 
        isOpen={!!cancelBookingData?.isOpen}
        onConfirm={async (reason) => {
          if (cancelBookingData?.bookingId) {
            try {
              await updateDoc(doc(db, 'bookings', cancelBookingData.bookingId), {
                status: 'cancelled',
                cancellationReason: reason
              });
              setAlertData({
                isOpen: true,
                title: t('success'),
                message: t('bookingCancelled'),
                type: 'success'
              });
            } catch (error) {
              console.error("Error cancelling booking:", error);
              setAlertData({
                isOpen: true,
                title: t('error'),
                message: t('error'),
                type: 'error'
              });
            }
          }
          setCancelBookingData(null);
        }}
        onCancel={() => setCancelBookingData(null)}
      />
    </div>
  );
};

const WorkerApplicationPage = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [phone, setPhone] = useState(profile?.phone || '');
  const [nationalId, setNationalId] = useState('');
  const [loading, setLoading] = useState(false);
  const [application, setApplication] = useState<WorkerApplication | null>(null);

  useEffect(() => {
    if (!profile) return;
    const unsubscribe = onSnapshot(doc(db, 'workerApplications', profile.uid), (docSnap) => {
      if (docSnap.exists()) {
        setApplication(docSnap.data() as WorkerApplication);
      }
    }, (error) => {
      console.error("App: WorkerApplicationPage snapshot error", error);
    });
    return () => unsubscribe();
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !phone || !nationalId || loading) return;
    
    setLoading(true);
    try {
      const appData: WorkerApplication = {
        uid: profile.uid,
        phone,
        email: profile.email || '',
        nationalId,
        status: 'pending',
        timestamp: Date.now()
      };
      await setDoc(doc(db, 'workerApplications', profile.uid), appData);
      // Alert success is handled by the UI showing the pending status
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'workerApplications');
    } finally {
      setLoading(false);
    }
  };

  if (profile?.role === 'worker') {
    return <Navigate to="/profile" />;
  }

  return (
    <div className="p-4 pb-20 max-w-md mx-auto">
      <button onClick={() => navigate(-1)} className="mb-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
        <ChevronLeft size={24} />
      </button>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16" />
        
        <h2 className="text-2xl font-bold mb-2 relative z-10">{t('becomeWorker')}</h2>
        <p className="text-sm text-gray-500 mb-6 relative z-10">{t('becomeWorkerDesc')}</p>

        {application ? (
          <div className="text-center py-8 space-y-4">
            <div className={cn(
              "w-20 h-20 mx-auto rounded-full flex items-center justify-center mb-4",
              application.status === 'pending' ? "bg-yellow-100 text-yellow-600" :
              application.status === 'approved' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
            )}>
              {application.status === 'pending' ? <Clock size={40} /> : 
               application.status === 'approved' ? <CheckCircle size={40} /> : <AlertCircle size={40} />}
            </div>
            <h3 className="text-xl font-bold">{t('applicationStatus')}: {t(application.status)}</h3>
            <p className="text-sm text-gray-500">
              {application.status === 'pending' ? t('reportSubmitted') : 
               application.status === 'approved' ? t('applySuccess') : t('rejected')}
            </p>
            {application.status === 'rejected' && (
              <button 
                onClick={() => setDoc(doc(db, 'workerApplications', profile.uid), { status: 'pending', timestamp: Date.now() }, { merge: true })}
                className="mt-4 text-primary font-bold hover:underline"
              >
                {t('resendCode')}
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 relative z-10">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">{t('phone')}</label>
              <input 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t('phone')}
                required
                readOnly={!!profile?.phone}
                className={cn(
                  "w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-primary",
                  profile?.phone && "opacity-70 cursor-not-allowed"
                )}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase">{t('nationalId')}</label>
              <input 
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder={t('nationalIdPlaceholder')}
                required
                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-primary"
              />
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {loading ? <LoadingScreen /> : <><CheckCircle size={20} /> {t('submitApplication').toUpperCase()}</>}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const ChatPage = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const { bookingId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    const unsubscribe = onSnapshot(doc(db, 'bookings', bookingId), (docSnap) => {
      if (docSnap.exists()) {
        setBooking(docSnap.data() as Booking);
      }
    }, (error) => {
      console.error("App: ChatPage booking snapshot error", error);
    });
    return () => unsubscribe();
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId) return;
    const q = query(collection(db, 'messages'), where('bookingId', '==', bookingId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => doc.data() as Message).sort((a, b) => a.timestamp - b.timestamp);
      setMessages(msgs);

      // Mark unread messages as read
      if (profile) {
        const unreadMessages = snapshot.docs.filter(doc => {
          const data = doc.data() as Message;
          return data.senderId !== profile.uid && !data.read;
        });

        if (unreadMessages.length > 0) {
          const batch = writeBatch(db);
          unreadMessages.forEach(docSnap => {
            batch.update(docSnap.ref, { read: true });
          });
          batch.commit().catch(err => handleFirestoreError(err, OperationType.UPDATE, 'messages'));
        }
      }
    }, (error) => {
      console.error("App: ChatPage messages snapshot error", error);
    });
    return () => unsubscribe();
  }, [bookingId, profile]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !profile || !bookingId) return;
    
    const msgId = Math.random().toString(36).substr(2, 9);
    const timestamp = Date.now();
    
    // Get booking to get emails for permissions
    const bookingDoc = await getDoc(doc(db, 'bookings', bookingId));
    const bookingData = bookingDoc.exists() ? bookingDoc.data() : null;

    const msgData = {
      id: msgId,
      bookingId,
      senderId: profile.uid,
      customerEmail: bookingData?.customerEmail || '',
      workerEmail: bookingData?.workerEmail || '',
      text: newMessage,
      timestamp,
      read: false
    };

    try {
      await setDoc(doc(db, 'messages', msgId), msgData);
      // Update booking with last message info
      await updateDoc(doc(db, 'bookings', bookingId), {
        lastMessage: newMessage,
        lastMessageSenderId: profile.uid,
        lastMessageTimestamp: timestamp
      });
      setNewMessage('');
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'messages');
    }
  };

  return (
    <div className="h-[calc(100vh-130px)] flex flex-col bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ChevronLeft /></Link>
          <div className="flex-1">
            <h2 className="font-bold">{t('chat')}</h2>
            {booking && (
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                {t(booking.category)} • {booking.customerName}
              </p>
            )}
          </div>
        </div>
        {booking && (
          <div className="px-10 py-2 bg-primary/5 rounded-xl border border-primary/10">
            <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 line-clamp-1">{booking.description}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
              <p className="text-[10px] text-gray-500 flex items-center gap-1">
                <MapPin size={10} /> {booking.location}
              </p>
              {booking.locationDescription && (
                <p className="text-[10px] text-primary font-bold flex items-center gap-1">
                  <Info size={10} /> {booking.locationDescription}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderId === profile?.uid;
          return (
            <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
              <div className={cn(
                "max-w-[80%] p-3 rounded-2xl shadow-sm text-sm",
                isMe ? "bg-primary text-white rounded-tr-none" : "bg-white dark:bg-gray-800 rounded-tl-none"
              )}>
                {msg.text}
                <div className="flex items-center justify-between gap-2 mt-1">
                  <p className={cn("text-[8px] opacity-70")}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  {isMe && (
                    <span className="text-[8px] opacity-70">
                      {msg.read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={handleSendMessage} className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex gap-2">
        <input 
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 border-none rounded-full focus:ring-2 focus:ring-primary outline-none"
        />
        <button type="submit" className="p-2 bg-primary text-white rounded-full shadow-lg hover:scale-105 transition-transform">
          <ChevronRight />
        </button>
      </form>
    </div>
  );
};

const HelpPage = () => {
  const { t } = useTranslation();
  const settings = useSettings();
  return (
    <div className="p-4 pb-20 max-w-2xl mx-auto">
      <h2 className="text-3xl font-black mb-8 tracking-tight">{t('help')}</h2>
      
      <div className="grid gap-6">
        {/* Support Contacts */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-2xl"><Mail size={24} /></div>
            <div>
              <h3 className="font-black text-sm">{t('supportEmail')}</h3>
              <p className="text-[10px] text-gray-500 font-bold">{settings.supportEmail}</p>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center text-center gap-3">
            <div className="p-3 bg-green-100 text-green-600 rounded-2xl"><Phone size={24} /></div>
            <div>
              <h3 className="font-black text-sm">{t('supportPhone')}</h3>
              <p className="text-[10px] text-gray-500 font-bold">{settings.supportPhone}</p>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary text-white rounded-xl"><Info size={20} /></div>
            <h3 className="font-black text-lg">{t('aboutApp')}</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
            {t('aboutAppDesc')}
          </p>
        </div>

        {/* Policy Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500 text-white rounded-xl"><ShieldCheck size={20} /></div>
            <h3 className="font-black text-lg">{t('appPolicy')}</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium mb-4">
            {t('appPolicyDesc')}
          </p>
          <ul className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <li key={i} className="flex gap-3 text-xs font-bold text-gray-700 dark:text-gray-300">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                {t(`policy_${i}`)}
              </li>
            ))}
          </ul>
        </div>

        {/* Safety Section */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-500 text-white rounded-xl"><Lock size={20} /></div>
            <h3 className="font-black text-lg">{t('safetyGuidelines')}</h3>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-medium mb-4">
            {t('safetyGuidelinesDesc')}
          </p>
          <div className="grid gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-2xl">
                <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{t(`safety_${i}`)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [editingWorker, setEditingWorker] = useState<WorkerProfile | null>(null);
  const [confirmData, setConfirmData] = useState<{ isOpen: boolean; id: string; type: 'worker' | 'ad' | 'category' } | null>(null);
  const [alertData, setAlertData] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'workers' | 'users' | 'reports' | 'applications' | 'settings' | 'ads' | 'categories'>('workers');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [applications, setApplications] = useState<WorkerApplication[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const appSettings = useSettings();

  // Category form state
  const [catId, setCatId] = useState('');
  const [catIcon, setCatIcon] = useState('');
  const [catNameEn, setCatNameEn] = useState('');
  const [catNameAr, setCatNameAr] = useState('');
  const [catNameKu, setCatNameKu] = useState('');
  const [catOrder, setCatOrder] = useState(0);
  const [catActive, setCatActive] = useState(true);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Ad form state
  const [adTitle, setAdTitle] = useState('');
  const [adDescription, setAdDescription] = useState('');
  const [adImageURL, setAdImageURL] = useState('');
  const [adLink, setAdLink] = useState('');
  const [adActive, setAdActive] = useState(true);
  const [adOrder, setAdOrder] = useState(0);
  const [isAddingAd, setIsAddingAd] = useState(false);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);

  // Settings form state
  const [supportEmail, setSupportEmail] = useState(appSettings.supportEmail);
  const [supportPhone, setSupportPhone] = useState(appSettings.supportPhone);
  const [whatsappNumber, setWhatsappNumber] = useState(appSettings.whatsappNumber);
  const [becomeWorkerWhatsappNumber, setBecomeWorkerWhatsappNumber] = useState(appSettings.becomeWorkerWhatsappNumber || appSettings.whatsappNumber);
  const [useInternalApplications, setUseInternalApplications] = useState(appSettings.useInternalApplications ?? false);
  const [becomeWorkerWhatsappMessage, setBecomeWorkerWhatsappMessage] = useState(appSettings.becomeWorkerWhatsappMessage || '');

  useEffect(() => {
    setSupportEmail(appSettings.supportEmail);
    setSupportPhone(appSettings.supportPhone);
    setWhatsappNumber(appSettings.whatsappNumber);
    setBecomeWorkerWhatsappNumber(appSettings.becomeWorkerWhatsappNumber || appSettings.whatsappNumber);
    setUseInternalApplications(appSettings.useInternalApplications ?? false);
    setBecomeWorkerWhatsappMessage(appSettings.becomeWorkerWhatsappMessage || '');
  }, [appSettings]);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState<City>(profile?.city || 'Baghdad');
  const [profession, setProfession] = useState('plumbing');
  const [phone, setPhone] = useState('');
  const [hours, setHours] = useState('8 AM - 5 PM');
  const [transport, setTransport] = useState(true);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [serviceArea, setServiceArea] = useState<City[]>([]);
  const [description, setDescription] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          // Limit size to avoid Firestore document limits (max 1MB)
          // Let's aim for max 400x400 for profile pics
          const maxSize = 400;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          const jpegData = canvas.toDataURL('image/jpeg', 0.7);
          setPhotoURL(jpegData);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePhotosChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && photos.length < 3) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxSize = 800; // Slightly larger for gallery photos
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          const jpegData = canvas.toDataURL('image/jpeg', 0.6);
          setPhotos(prev => [...prev, jpegData]);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxWidth = 1200;
          const maxHeight = 600;
          let width = img.width;
          let height = img.height;
          
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          const jpegData = canvas.toDataURL('image/jpeg', 0.7);
          setAdImageURL(jpegData);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    const q = query(collection(db, 'workers'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setWorkers(snapshot.docs.map(doc => doc.data() as WorkerProfile));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'workers');
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      const q = query(collection(db, 'users'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setAllUsers(snapshot.docs.map(doc => doc.data() as UserProfile));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'users');
      });
      return () => unsubscribe();
    } else if (activeTab === 'reports') {
      const q = query(collection(db, 'reports'), orderBy('timestamp', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setReports(snapshot.docs.map(doc => doc.data() as Report));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'reports');
      });
      return () => unsubscribe();
    } else if (activeTab === 'applications') {
      const q = query(collection(db, 'workerApplications'), orderBy('timestamp', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setApplications(snapshot.docs.map(doc => doc.data() as WorkerApplication));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'workerApplications');
      });
      return () => unsubscribe();
    } else if (activeTab === 'ads') {
      const q = query(collection(db, 'ads'), orderBy('order', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setAds(snapshot.docs.map(doc => doc.data() as Ad));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'ads');
      });
      return () => unsubscribe();
    } else if (activeTab === 'categories') {
      const q = query(collection(db, 'categories'), orderBy('order', 'asc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        setCategories(snapshot.docs.map(doc => doc.data() as Category));
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'categories');
      });
      return () => unsubscribe();
    }
  }, [activeTab]);

  const resetForm = () => {
    setName('');
    setEmail('');
    setCity(profile?.city || 'Baghdad');
    setProfession('plumbing');
    setPhone('');
    setHours('8 AM - 5 PM');
    setTransport(true);
    setSpecialties([]);
    setServiceArea([]);
    setDescription('');
    setPhotoURL('');
    setPhotos([]);
    setIsAdding(false);
    setEditingWorker(null);
  };

  const resetCategoryForm = () => {
    setCatId('');
    setCatIcon('');
    setCatNameEn('');
    setCatNameAr('');
    setCatNameKu('');
    setCatOrder(0);
    setCatActive(true);
    setIsAddingCategory(false);
    setEditingCategory(null);
  };

  useEffect(() => {
    if (editingCategory) {
      setCatId(editingCategory.id);
      setCatIcon(editingCategory.icon);
      setCatNameEn(editingCategory.nameEn);
      setCatNameAr(editingCategory.nameAr);
      setCatNameKu(editingCategory.nameKu);
      setCatOrder(editingCategory.order);
      setCatActive(editingCategory.active);
      setIsAddingCategory(true);
    }
  }, [editingCategory]);

  useEffect(() => {
    if (editingWorker) {
      setName(editingWorker.name);
      setEmail(editingWorker.email);
      setCity(editingWorker.city);
      setProfession(editingWorker.profession);
      setPhone(editingWorker.phone);
      setHours(editingWorker.workingHours);
      setTransport(editingWorker.hasTransport);
      setSpecialties(editingWorker.specialties || []);
      setServiceArea(editingWorker.service_area || []);
      setDescription(editingWorker.description || '');
      setPhotoURL(editingWorker.photoURL || '');
      setPhotos(editingWorker.photos || []);
      setIsAdding(true);
    }
  }, [editingWorker]);

  const handleSave = async () => {
    try {
      if (!name || !phone || !city || !profession) {
        setAlertData({ isOpen: true, title: t('error'), message: t('fillAllFields'), type: 'error' });
        return;
      }

      const uid = editingWorker?.uid || Math.random().toString(36).substr(2, 9);
      const workerData = {
        uid,
        name,
        email: email || `${uid}@khdmat.iq`,
        city,
        profession,
        specialties,
        service_area: Array.from(new Set([city, ...serviceArea])),
        phone,
        workingHours: hours,
        hasTransport: transport,
        description,
        photoURL,
        photos,
        rating: editingWorker?.rating || 5.0,
        location: editingWorker?.location || { lat: 33.3152, lng: 44.3661 },
        role: 'worker',
        createdAt: editingWorker?.createdAt || Date.now()
      };

      await setDoc(doc(db, 'workers', uid), workerData);
      
      // Link to user if they exist by phone or email
      const { getDocs } = await import('firebase/firestore');
      let userDocId = null;

      if (email) {
        const usersQuery = query(collection(db, 'users'), where('email', '==', email));
        const userDocs = await getDocs(usersQuery);
        if (!userDocs.empty) {
          userDocId = userDocs.docs[0].id;
        }
      }

      if (!userDocId && phone) {
        const usersQuery = query(collection(db, 'users'), where('phone', '==', phone));
        const userDocs = await getDocs(usersQuery);
        if (!userDocs.empty) {
          userDocId = userDocs.docs[0].id;
        }
      }

      if (userDocId) {
        await setDoc(doc(db, 'users', userDocId), {
          role: 'worker',
          workerId: uid
        }, { merge: true });
      }
      
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'workers');
    }
  };

  const handleSaveCategory = async () => {
    try {
      if (!catId || !catNameEn || !catNameAr || !catNameKu || !catIcon) {
        setAlertData({ isOpen: true, title: t('error'), message: t('fillAllFields'), type: 'error' });
        return;
      }
      
      const categoryData: Category = {
        id: catId,
        icon: catIcon,
        nameEn: catNameEn,
        nameAr: catNameAr,
        nameKu: catNameKu,
        order: catOrder,
        active: catActive
      };

      await setDoc(doc(db, 'categories', catId), categoryData);
      resetCategoryForm();
      setAlertData({ isOpen: true, title: t('success'), message: t('success'), type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `categories/${catId}`);
    }
  };

  const handleSeedCategories = async () => {
    try {
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

      const batch = writeBatch(db);
      for (const cat of defaultCategories) {
        batch.set(doc(db, 'categories', cat.id), cat);
      }
      await batch.commit();
      setAlertData({ isOpen: true, title: t('success'), message: t('success'), type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'categories');
    }
  };

  const handleRoleChange = async (uid: string, newRole: 'user' | 'worker' | 'admin') => {
    try {
      await updateDoc(doc(db, 'users', uid), { role: newRole });
      setAlertData({ isOpen: true, title: t('success'), message: t('roleUpdated'), type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
    }
  };

  const handleDelete = async (uid: string) => {
    setConfirmData({ isOpen: true, id: uid, type: 'worker' });
  };

  const handleDeleteCategory = async (id: string) => {
    setConfirmData({ isOpen: true, id, type: 'category' });
  };

  const handleUpdateSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'app_settings'), {
        supportEmail,
        supportPhone,
        whatsappNumber,
        becomeWorkerWhatsappNumber,
        useInternalApplications,
        becomeWorkerWhatsappMessage
      });
      setAlertData({
        isOpen: true,
        title: t('success'),
        message: t('settingsUpdated'),
        type: 'success'
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/app_settings');
      setAlertData({
        isOpen: true,
        title: t('error'),
        message: t('reportError'),
        type: 'error'
      });
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
      setAlertData({ isOpen: true, title: t('success'), message: t('reportResolved'), type: 'success' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  const handleApplicationAction = async (application: WorkerApplication, status: 'approved' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'workerApplications', application.uid), { status });
      
      if (status === 'approved') {
        // Update user role
        await updateDoc(doc(db, 'users', application.uid), { role: 'worker' });
        
        // Create initial worker profile if it doesn't exist
        const workerRef = doc(db, 'workers', application.uid);
        const workerSnap = await getDoc(workerRef);
        if (!workerSnap.exists()) {
          const userSnap = await getDoc(doc(db, 'users', application.uid));
          const userData = userSnap.data() as UserProfile;
          
          await setDoc(workerRef, {
            uid: application.uid,
            name: userData.name,
            email: userData.email,
            phone: application.phone,
            city: userData.city,
            profession: 'plumbing', // Default
            specialties: [],
            service_area: [userData.city],
            workingHours: '8 AM - 5 PM',
            hasTransport: true,
            rating: 5.0,
            location: { lat: 33.3152, lng: 44.3661 },
            role: 'worker',
            createdAt: Date.now(),
            isAvailable: true
          });
        }
      }
      
      setAlertData({ 
        isOpen: true, 
        title: t('success'), 
        message: status === 'approved' ? t('approved') : t('rejected'), 
        type: 'success' 
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `workerApplications/${application.uid}`);
    }
  };

  const handleSaveAd = async () => {
    try {
      const id = editingAd?.id || Math.random().toString(36).substr(2, 9);
      const adData: Ad = {
        id,
        title: adTitle,
        description: adDescription,
        imageURL: adImageURL,
        link: adLink,
        active: adActive,
        order: Number(adOrder),
        createdAt: editingAd?.createdAt || Date.now()
      };

      await setDoc(doc(db, 'ads', id), adData);
      resetAdForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'ads');
    }
  };

  const resetAdForm = () => {
    setAdTitle('');
    setAdDescription('');
    setAdImageURL('');
    setAdLink('');
    setAdActive(true);
    setAdOrder(0);
    setIsAddingAd(false);
    setEditingAd(null);
  };

  const handleDeleteAd = async (id: string) => {
    setConfirmData({ isOpen: true, id, type: 'ad' });
  };

  if (profile?.role !== 'admin') return <Navigate to="/" />;

  return (
    <div className="p-4 pb-20">
      <ConfirmDialog 
        isOpen={!!confirmData?.isOpen}
        title={t('confirmDelete')}
        message={t('confirmDeleteMessage')}
        onConfirm={async () => {
          if (confirmData?.id) {
            try {
              if (confirmData.type === 'worker') {
                await deleteDoc(doc(db, 'workers', confirmData.id));
                await deleteDoc(doc(db, 'users', confirmData.id));
              } else if (confirmData.type === 'ad') {
                await deleteDoc(doc(db, 'ads', confirmData.id));
              } else if (confirmData.type === 'category') {
                await deleteDoc(doc(db, 'categories', confirmData.id));
              }
            } catch (error) {
              handleFirestoreError(error, OperationType.DELETE, `${confirmData.type === 'worker' ? 'workers' : confirmData.type === 'ad' ? 'ads' : 'categories'}/${confirmData.id}`);
            }
          }
          setConfirmData(null);
        }}
        onCancel={() => setConfirmData(null)}
        confirmText={t('delete')}
        cancelText={t('cancel')}
      />
      <Alert 
        isOpen={!!alertData?.isOpen}
        title={alertData?.title || ''}
        message={alertData?.message || ''}
        type={alertData?.type || 'info'}
        onClose={() => setAlertData(null)}
      />
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t('adminDashboard')}</h2>
        {activeTab === 'workers' && (
          <button 
            onClick={() => setIsAdding(true)}
            className="p-2 bg-primary text-white rounded-full shadow-lg"
          >
            <Plus />
          </button>
        )}
        {activeTab === 'categories' && (
          <button 
            onClick={() => setIsAddingCategory(true)}
            className="p-2 bg-primary text-white rounded-full shadow-lg"
          >
            <Plus />
          </button>
        )}
      </div>

      <div className="flex gap-2 mb-6 bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl flex-wrap">
        <button 
          onClick={() => setActiveTab('workers')}
          className={cn(
            "flex-1 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 min-w-[100px]",
            activeTab === 'workers' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-500"
          )}
        >
          <Briefcase size={16} /> {t('workers')}
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={cn(
            "flex-1 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 min-w-[100px]",
            activeTab === 'users' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-500"
          )}
        >
          <Users size={16} /> {t('users')}
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={cn(
            "flex-1 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 min-w-[100px]",
            activeTab === 'reports' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-500"
          )}
        >
          <Flag size={16} /> {t('reports')}
        </button>
        <button 
          onClick={() => setActiveTab('applications')}
          className={cn(
            "flex-1 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 min-w-[100px]",
            activeTab === 'applications' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-500"
          )}
        >
          <FileText size={16} /> {t('applications')}
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "flex-1 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 min-w-[100px]",
            activeTab === 'settings' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-500"
          )}
        >
          <Settings size={16} /> {t('settings')}
        </button>
        <button 
          onClick={() => setActiveTab('ads')}
          className={cn(
            "flex-1 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 min-w-[100px]",
            activeTab === 'ads' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-500"
          )}
        >
          <ImageIcon size={16} /> {t('ads')}
        </button>
        <button 
          onClick={() => setActiveTab('categories')}
          className={cn(
            "flex-1 py-2 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 min-w-[100px]",
            activeTab === 'categories' ? "bg-white dark:bg-gray-800 shadow-sm text-primary" : "text-gray-500"
          )}
        >
          <Grid size={16} /> {t('categories')}
        </button>
      </div>

      {activeTab === 'workers' ? (
        <>
          <AnimatePresence>
            {(isAdding || editingWorker) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl mb-8 border border-primary/20"
              >
                <h3 className="text-xl font-bold mb-4">{editingWorker ? t('editWorker') : t('addWorker')}</h3>
                <div className="grid gap-4">
                  <input value={name} onChange={e => setName(e.target.value)} placeholder={t('name')} className="p-2 border rounded-lg dark:bg-gray-700" />
                  <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('phone')} className="p-2 border rounded-lg dark:bg-gray-700" />
                  <select value={city} onChange={e => setCity(e.target.value as City)} className="p-2 border rounded-lg dark:bg-gray-700">
                    {IRAQI_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <select value={profession} onChange={e => setProfession(e.target.value)} className="p-2 border rounded-lg dark:bg-gray-700">
                    {['plumbing', 'acFixing', 'electrical', 'cleaning', 'gardening', 'carpentry', 'painting', 'applianceRepair', 'pestControl', 'locksmith', 'movingDelivery', 'decoration', 'securityCameras', 'internet'].map(p => <option key={p} value={p}>{t(p)}</option>)}
                  </select>

                  <div className="space-y-2">
                    <label className="text-sm font-bold">{t('specialties')}</label>
                    <div className="flex flex-wrap gap-2">
                      {['plumbing', 'acFixing', 'electrical', 'cleaning', 'gardening', 'carpentry', 'painting', 'applianceRepair', 'pestControl', 'locksmith', 'movingDelivery', 'decoration', 'securityCameras', 'internet'].map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setSpecialties(prev => 
                              prev?.includes(p) ? prev.filter(s => s !== p) : [...(prev || []), p]
                            );
                          }}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold transition-all",
                            specialties?.includes(p) ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                          )}
                        >
                          {t(p)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold">{t('serviceArea')}</label>
                    <div className="flex flex-wrap gap-2">
                      {IRAQI_CITIES.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            setServiceArea(prev => 
                              prev?.includes(c) ? prev.filter(s => s !== c) : [...(prev || []), c]
                            );
                          }}
                          className={cn(
                            "px-3 py-1 rounded-full text-xs font-bold transition-all",
                            serviceArea?.includes(c) ? "bg-primary text-white" : "bg-gray-100 dark:bg-gray-700 text-gray-500"
                          )}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold">{t('photoURL')} (.png)</label>
                    <div className="flex items-center gap-3">
                      {photoURL && (
                        <img src={photoURL} alt="Preview" className="w-12 h-12 rounded-full object-cover border-2 border-primary" referrerPolicy="no-referrer" />
                      )}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20"
                      />
                    </div>
                    <input 
                      value={photoURL} 
                      onChange={e => setPhotoURL(e.target.value)} 
                      placeholder={t('photoURL')} 
                      className="p-2 border rounded-lg dark:bg-gray-700 w-full text-xs" 
                    />
                  </div>
                  <textarea 
                    value={description} 
                    onChange={e => setDescription(e.target.value)} 
                    placeholder={t('workerDescription')} 
                    className="p-2 border rounded-lg dark:bg-gray-700 h-24 resize-none" 
                  />
                  
                  <div className="space-y-2">
                    <label className="text-sm font-bold flex items-center justify-between">
                      <span>{t('photos')} ({photos.length}/3)</span>
                      <span className="text-[10px] text-gray-500 font-normal">{t('maxPhotos')}</span>
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {photos.map((p, idx) => p && (
                        <div key={idx} className="relative group">
                          <img src={p} alt={`Photo ${idx + 1}`} className="w-20 h-20 rounded-xl object-cover border-2 border-primary/20" referrerPolicy="no-referrer" />
                          <button 
                            type="button"
                            onClick={() => setPhotos(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                      {photos.length < 3 && (
                        <label className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors">
                          <Camera size={20} className="text-gray-400" />
                          <span className="text-[8px] mt-1 text-gray-400">{t('addPhoto')}</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handlePhotosChange} 
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  </div>

                  <input value={hours} onChange={e => setHours(e.target.value)} placeholder={t('workingHours')} className="p-2 border rounded-lg dark:bg-gray-700" />
                  <div className="items-center gap-2 flex">
                    <input type="checkbox" checked={transport} onChange={e => setTransport(e.target.checked)} id="transport" />
                    <label htmlFor="transport">{t('transport')}</label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSave} className="flex-1 py-2 bg-primary text-white rounded-lg font-bold">{t('save')}</button>
                    <button onClick={resetForm} className="flex-1 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg font-bold">{t('cancel')}</button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {workers.map(worker => (
              <div key={worker.uid} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md flex items-center justify-between">
                <div>
                  <p className="font-bold">{worker.name}</p>
                  <p className="text-xs text-gray-500">{t(worker.profession)} - {worker.city}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingWorker(worker);
                      setName(worker.name);
                      setEmail(worker.email);
                      setCity(worker.city);
                      setProfession(worker.profession);
                      setSpecialties(worker.specialties || []);
                      setServiceArea(worker.service_area || []);
                      setPhone(worker.phone);
                      setHours(worker.workingHours);
                      setTransport(worker.hasTransport);
                      setDescription(worker.description || '');
                      setPhotoURL(worker.photoURL || '');
                    }}
                    className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                  >
                    <Edit3 size={18} />
                  </button>
                  <button onClick={() => handleDelete(worker.uid)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : activeTab === 'users' ? (
        <div className="space-y-4">
          {allUsers.map(user => (
            <div key={user.uid} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md flex items-center justify-between">
              <div className="flex items-center gap-3">
                {user.photoURL ? (
                  <img src={user.photoURL} alt={user.name} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                    {user.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-bold text-sm">{user.name}</p>
                  <p className="text-[10px] text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select 
                  value={user.role}
                  onChange={(e) => handleRoleChange(user.uid, e.target.value as any)}
                  className={cn(
                    "text-[10px] font-bold py-1 px-2 rounded-lg border-none focus:ring-1 focus:ring-primary",
                    user.role === 'admin' ? "bg-purple-100 text-purple-700" : 
                    user.role === 'worker' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
                  )}
                >
                  <option value="user">USER</option>
                  <option value="worker">WORKER</option>
                  <option value="admin">ADMIN</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      ) : activeTab === 'reports' ? (
        <div className="space-y-4">
          {reports.map(report => (
            <div key={report.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md border border-red-100 dark:border-red-900/30">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase",
                    report.status === 'pending' ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"
                  )}>
                    {t(report.status)}
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {new Date(report.timestamp).toLocaleString()}
                  </span>
                </div>
                {report.status === 'pending' && (
                  <button 
                    onClick={() => handleResolveReport(report.id)}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    {t('resolve')}
                  </button>
                )}
              </div>
              <p className="text-sm font-bold mb-1">{t(report.reason)}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{report.details}</p>
              <div className="flex gap-4 text-[10px] text-gray-500 bg-gray-50 dark:bg-gray-900/50 p-2 rounded-lg">
                <p><span className="font-bold">{t('reporter')}:</span> {report.reporterId}</p>
                <p><span className="font-bold">{t('reported')}:</span> {report.reportedId}</p>
                <p><span className="font-bold">{t('booking')}:</span> {report.bookingId}</p>
              </div>
            </div>
          ))}
          {reports.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <Flag size={48} className="mx-auto mb-4 opacity-20" />
              <p>{t('noReports')}</p>
            </div>
          )}
        </div>
      ) : activeTab === 'applications' ? (
        <div className="space-y-4">
          {applications.map(app => (
            <div key={app.uid} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold">{app.email}</p>
                  <p className="text-xs text-gray-500">{new Date(app.timestamp).toLocaleString()}</p>
                </div>
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[8px] font-bold uppercase",
                  app.status === 'pending' ? "bg-yellow-100 text-yellow-700" :
                  app.status === 'approved' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                )}>
                  {t(app.status)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                <p><span className="text-gray-500">{t('phone')}:</span> {app.phone}</p>
                <p><span className="text-gray-500">{t('nationalId')}:</span> {app.nationalId}</p>
              </div>
              {app.status === 'pending' && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleApplicationAction(app, 'approved')}
                    className="flex-1 py-2 bg-green-500 text-white rounded-lg font-bold text-xs"
                  >
                    {t('approve')}
                  </button>
                  <button 
                    onClick={() => handleApplicationAction(app, 'rejected')}
                    className="flex-1 py-2 bg-red-500 text-white rounded-lg font-bold text-xs"
                  >
                    {t('reject')}
                  </button>
                </div>
              )}
            </div>
          ))}
          {applications.length === 0 && (
            <div className="text-center py-10 text-gray-500">
              <FileText size={48} className="mx-auto mb-4 opacity-20" />
              <p>{t('noApplications')}</p>
            </div>
          )}
        </div>
      ) : activeTab === 'ads' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">{t('manageAds')}</h3>
            <button 
              onClick={() => setIsAddingAd(true)}
              className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm flex items-center gap-2"
            >
              <Plus size={16} /> {t('addAd')}
            </button>
          </div>

          <AnimatePresence>
            {(isAddingAd || editingAd) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl border border-primary/20"
              >
                <h4 className="text-lg font-bold mb-4">{editingAd ? t('editAd') : t('addAd')}</h4>
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('adTitle')}</label>
                    <input 
                      value={adTitle} 
                      onChange={e => setAdTitle(e.target.value)} 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('adDescription')}</label>
                    <textarea 
                      value={adDescription} 
                      onChange={e => setAdDescription(e.target.value)} 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-primary h-24 resize-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('adLink')}</label>
                    <input 
                      value={adLink} 
                      onChange={e => setAdLink(e.target.value)} 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-primary"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase">{t('adOrder')}</label>
                      <input 
                        type="number"
                        value={adOrder} 
                        onChange={e => setAdOrder(Number(e.target.value))} 
                        className="w-full p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-6">
                      <input 
                        type="checkbox" 
                        id="adActive"
                        checked={adActive} 
                        onChange={e => setAdActive(e.target.checked)} 
                        className="w-5 h-5 rounded text-primary focus:ring-primary"
                      />
                      <label htmlFor="adActive" className="text-sm font-bold">{t('adActive')}</label>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-500 uppercase">{t('adImage')}</label>
                    <div className="flex items-center gap-4">
                      {adImageURL && (
                        <div className="relative group">
                          <img src={adImageURL} alt="Preview" className="w-24 h-12 rounded-lg object-cover border border-gray-200" referrerPolicy="no-referrer" />
                          <button 
                            onClick={() => setAdImageURL('')}
                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow-lg transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                      <label className="flex-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center cursor-pointer hover:border-primary transition-colors">
                        <Camera size={20} className="text-gray-400 mr-2" />
                        <span className="text-sm text-gray-500">{t('addPhoto')}</span>
                        <input type="file" accept="image/*" onChange={handleAdImageChange} className="hidden" />
                      </label>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={handleSaveAd}
                      className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20"
                    >
                      {t('save')}
                    </button>
                    <button 
                      onClick={resetAdForm}
                      className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold"
                    >
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid gap-4">
            {ads.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                <Pin size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">{t('noAds')}</p>
              </div>
            ) : (
              ads.map(ad => (
                <div key={ad.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md flex gap-4 items-center">
                  {ad.imageURL && (
                    <img src={ad.imageURL} alt={ad.title} className="w-24 h-16 rounded-xl object-cover" referrerPolicy="no-referrer" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-bold truncate">{ad.title}</h5>
                      {!ad.active && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full font-bold uppercase">
                          {t('unavailable')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">{ad.description}</p>
                    <p className="text-[10px] text-primary font-bold mt-1">{t('adOrder')}: {ad.order}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingAd(ad);
                        setAdTitle(ad.title);
                        setAdDescription(ad.description);
                        setAdImageURL(ad.imageURL);
                        setAdLink(ad.link || '');
                        setAdActive(ad.active);
                        setAdOrder(ad.order);
                        setIsAddingAd(true);
                      }}
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteAd(ad.id)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : activeTab === 'categories' ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">{t('manageCategories')}</h3>
            <button 
              onClick={() => setIsAddingCategory(true)}
              className="px-4 py-2 bg-primary text-white rounded-xl font-bold text-sm flex items-center gap-2"
            >
              <Plus size={16} /> {t('addCategory')}
            </button>
          </div>

          <AnimatePresence>
            {(isAddingCategory || editingCategory) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-xl mb-8 border border-primary/20"
              >
                <h3 className="text-xl font-bold mb-4">{editingCategory ? t('editCategory') : t('addCategory')}</h3>
                <div className="grid gap-4">
                  <input value={catId} onChange={e => setCatId(e.target.value)} placeholder="ID (e.g., plumbing)" className="p-2 border rounded-lg dark:bg-gray-700" disabled={!!editingCategory} />
                  <input value={catIcon} onChange={e => setCatIcon(e.target.value)} placeholder="Emoji Icon (e.g., 💧)" className="p-2 border rounded-lg dark:bg-gray-700" />
                  <input value={catNameEn} onChange={e => setCatNameEn(e.target.value)} placeholder="English Name" className="p-2 border rounded-lg dark:bg-gray-700" />
                  <input value={catNameAr} onChange={e => setCatNameAr(e.target.value)} placeholder="Arabic Name" className="p-2 border rounded-lg dark:bg-gray-700" dir="rtl" />
                  <input value={catNameKu} onChange={e => setCatNameKu(e.target.value)} placeholder="Kurdish Name" className="p-2 border rounded-lg dark:bg-gray-700" dir="rtl" />
                  <input type="number" value={catOrder} onChange={e => setCatOrder(Number(e.target.value))} placeholder="Order" className="p-2 border rounded-lg dark:bg-gray-700" />
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={catActive} onChange={e => setCatActive(e.target.checked)} className="rounded text-primary focus:ring-primary" />
                    <span className="text-sm font-bold">{t('active')}</span>
                  </label>
                  
                  <div className="flex gap-2 pt-4">
                    <button onClick={handleSaveCategory} className="flex-1 py-3 bg-primary text-white rounded-xl font-bold shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all">
                      {t('save')}
                    </button>
                    <button onClick={resetCategoryForm} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all">
                      {t('cancel')}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid gap-4">
            {categories.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <Grid size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-6">{t('noCategories')}</p>
                <button 
                  onClick={handleSeedCategories}
                  className="px-6 py-3 bg-primary/10 text-primary rounded-xl font-bold hover:bg-primary/20 transition-all flex items-center gap-2 mx-auto"
                >
                  <Plus size={20} /> {t('seedCategories')}
                </button>
              </div>
            ) : (
              categories.map(cat => (
                <div key={cat.id} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-md flex gap-4 items-center">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-2xl">
                    {cat.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-bold truncate">{cat.nameEn} / {cat.nameAr} / {cat.nameKu}</h5>
                      {!cat.active && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded-full font-bold uppercase">
                          {t('unavailable')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-1">ID: {cat.id} | Order: {cat.order}</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setEditingCategory(cat);
                        setCatId(cat.id);
                        setCatIcon(cat.icon);
                        setCatNameEn(cat.nameEn);
                        setCatNameAr(cat.nameAr);
                        setCatNameKu(cat.nameKu);
                        setCatOrder(cat.order);
                        setCatActive(cat.active);
                        setIsAddingCategory(true);
                      }}
                      className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <Edit3 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-md space-y-6">
          <h3 className="text-xl font-bold mb-4">{t('settings')}</h3>
          
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('supportEmail')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="email" 
                  value={supportEmail} 
                  onChange={e => setSupportEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all"
                  placeholder="support@khdmat.iq"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('supportPhone')}</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  value={supportPhone} 
                  onChange={e => setSupportPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all"
                  placeholder="+964 770 000 0000"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('whatsappNumber')}</label>
              <div className="relative">
                <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  value={whatsappNumber} 
                  onChange={e => setWhatsappNumber(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all"
                  placeholder="9647700000000"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
              <h4 className="text-sm font-bold mb-4 flex items-center gap-2">
                <Briefcase size={16} className="text-primary" />
                {t('becomeWorker')} {t('settings')}
              </h4>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                  <div>
                    <p className="text-sm font-bold">{t('useInternalApplications')}</p>
                    <p className="text-[10px] text-gray-500">{t('useInternalApplicationsDesc')}</p>
                  </div>
                  <button 
                    onClick={() => setUseInternalApplications(!useInternalApplications)}
                    className={cn(
                      "w-12 h-6 rounded-full transition-all relative",
                      useInternalApplications ? "bg-primary" : "bg-gray-300"
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                      useInternalApplications ? "right-1" : "left-1"
                    )} />
                  </button>
                </div>

                {!useInternalApplications && (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('becomeWorkerWhatsappNumber')}</label>
                      <div className="relative">
                        <MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                          type="text" 
                          value={becomeWorkerWhatsappNumber} 
                          onChange={e => setBecomeWorkerWhatsappNumber(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all"
                          placeholder="9647700000000"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">{t('whatsappMessage')}</label>
                      <textarea 
                        value={becomeWorkerWhatsappMessage} 
                        onChange={e => setBecomeWorkerWhatsappMessage(e.target.value)}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-xl focus:ring-2 focus:ring-primary transition-all h-24 resize-none text-sm"
                        placeholder="hi, how can i work for KHDMAT..."
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            <button 
              onClick={handleUpdateSettings}
              className="w-full py-4 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle size={20} />
              {t('updateSettings').toUpperCase()}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const CategoryWorkersPage = () => {
  const { t, i18n } = useTranslation();
  const { categoryId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category | null>(null);

  useEffect(() => {
    if (!categoryId) return;
    const unsubscribe = onSnapshot(doc(db, 'categories', categoryId), (docSnap) => {
      if (docSnap.exists()) {
        setCategory(docSnap.data() as Category);
      }
    });
    return () => unsubscribe();
  }, [categoryId]);

  useEffect(() => {
    if (!profile?.city || !categoryId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(collection(db, 'workers'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const workersData = snapshot.docs.map(doc => doc.data() as WorkerProfile);
      const filtered = workersData.filter(w => {
        const inCity = w.city === profile.city || (w.service_area && w.service_area?.includes(profile.city));
        const inCategory = w.profession === categoryId || (w.specialties && w.specialties?.includes(categoryId));
        return inCity && inCategory;
      }).sort((a, b) => {
        // Available workers first
        const availA = a.isAvailable !== false ? 1 : 0;
        const availB = b.isAvailable !== false ? 1 : 0;
        if (availA !== availB) return availB - availA;
        // Then by rating
        return b.rating - a.rating;
      });
      setWorkers(filtered);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'workers');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile?.city, categoryId]);

  const getCategoryName = () => {
    if (!category) return categoryId ? t(categoryId) : t('workers');
    return i18n.language === 'ar' ? category.nameAr : i18n.language === 'ku' ? category.nameKu : category.nameEn;
  };

  return (
    <div className="pb-20 p-4 bg-gray-50 dark:bg-gray-950 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-white dark:bg-gray-800 rounded-full shadow-sm">
          <ChevronLeft size={24} />
        </button>
        <h2 className="text-2xl font-black tracking-tight text-primary">
          {category?.icon} {getCategoryName()}
        </h2>
      </div>

      <div>
        <h2 className="text-lg font-black tracking-tight mb-4 flex items-center justify-between">
          {t('workers')}
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{workers.length} {t('workers').toLowerCase()}</span>
        </h2>
        
        {loading ? (
          <div className="flex justify-center py-12"><LoadingScreen inline /></div>
        ) : workers.length > 0 ? (
          <div className="grid gap-4">
            {workers.map((worker) => (
              <motion.div 
                key={worker.uid}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "bg-white dark:bg-gray-800 rounded-2xl shadow-md p-4 flex gap-4 border border-gray-100 dark:border-gray-700 transition-all",
                  worker.isAvailable === false && "opacity-60 grayscale-[0.5]"
                )}
              >
                <div 
                  className="relative cursor-pointer"
                  onClick={() => navigate(`/worker/${worker.uid}`)}
                >
                  {worker.photoURL ? (
                    <img src={worker.photoURL} alt={worker.name} className="w-20 h-20 rounded-xl object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-20 h-20 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-2xl">👤</div>
                  )}
                  {worker.isAvailable === false && (
                    <div className="absolute inset-0 bg-black/40 rounded-xl flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">{t('unavailable')}</span>
                    </div>
                  )}
                  {worker.email && !worker.email.endsWith('@khdmat.iq') && (
                    <div className="absolute -top-2 -left-2 bg-blue-500 text-white p-1 rounded-full shadow-lg border-2 border-white dark:border-gray-800">
                      <Mail size={12} />
                    </div>
                  )}
                  <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-white px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 shadow-sm">
                    <Star size={10} fill="white" /> {worker.rating}
                  </div>
                </div>

                <div className="flex-1">
                  <h3 
                    className="font-bold text-lg cursor-pointer hover:text-primary transition-colors"
                    onClick={() => navigate(`/worker/${worker.uid}`)}
                  >
                    {worker.name}
                  </h3>
                  <p className="text-primary text-sm font-medium mb-1">{t(worker.profession)}</p>
                  
                  <div className="flex flex-wrap gap-1 mb-3">
                    {worker.specialties?.slice(0, 2).map(s => (
                      <span key={s} className="text-[9px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full font-bold text-gray-600 dark:text-gray-300">
                        {t(s)}
                      </span>
                    ))}
                    {worker.specialties && worker.specialties.length > 2 && (
                      <span className="text-[9px] bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full font-bold text-gray-600 dark:text-gray-300">
                        +{worker.specialties.length - 2}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 font-bold">
                      <MapPin size={10} /> {worker.city}
                    </div>
                    <button 
                      onClick={() => navigate(`/book/${worker.uid}`)}
                      disabled={worker.isAvailable === false}
                      className={cn(
                        "px-4 py-1.5 rounded-full text-[10px] font-black shadow-sm transition-all",
                        worker.isAvailable !== false 
                          ? "bg-primary text-white hover:scale-105 active:scale-95" 
                          : "bg-gray-200 text-gray-500 cursor-not-allowed"
                      )}
                    >
                      {t('bookNow').toUpperCase()}
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="text-gray-400" size={24} />
            </div>
            <p className="text-gray-500 font-medium">{t('noWorkersFound')}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---

const WorkerProfilePage = () => {
  const { t } = useTranslation();
  const { workerId } = useParams();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (!workerId) return;
    
    setLoading(true);

    // Listen for worker profile
    const unsubscribeWorker = onSnapshot(doc(db, 'workers', workerId), (docSnap) => {
      if (docSnap.exists()) {
        setWorker(docSnap.data() as WorkerProfile);
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `workers/${workerId}`);
      setLoading(false);
    });

    // Listen for reviews
    const q = query(collection(db, 'reviews'), where('workerId', '==', workerId));
    const unsubscribeReviews = onSnapshot(q, (snapshot) => {
      setReviews(snapshot.docs.map(doc => doc.data() as Review).sort((a, b) => b.timestamp - a.timestamp));
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'reviews');
    });

    return () => {
      unsubscribeWorker();
      unsubscribeReviews();
    };
  }, [workerId]);

  const handleToggleAvailability = async () => {
    if (!worker || toggling) return;
    setToggling(true);
    try {
      await updateDoc(doc(db, 'workers', worker.uid), {
        isAvailable: worker.isAvailable === false
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'workers');
    } finally {
      setToggling(false);
    }
  };

  if (loading) return <LoadingScreen />;
  if (!worker) return <div className="text-center py-12">{t('noWorkers')}</div>;

  const isMyProfile = profile?.uid === worker.uid;
  const isAvailable = worker.isAvailable !== false;

  return (
    <div className="pb-20 p-4 max-w-2xl mx-auto">
      <button onClick={() => navigate(-1)} className="mb-4 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
        <ChevronLeft size={24} />
      </button>

      <div className={cn(
        "bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-6 mb-6 transition-all",
        !isAvailable && "opacity-80 grayscale-[0.3]"
      )}>
        <div className="flex flex-col items-center">
          <div className="relative mb-4">
            {worker.photoURL ? (
              <img src={worker.photoURL} alt={worker.name} className="w-32 h-32 rounded-full border-4 border-primary shadow-lg" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-32 h-32 rounded-full bg-primary flex items-center justify-center text-white text-5xl font-bold shadow-lg">
                {worker.name.charAt(0)}
              </div>
            )}
            <div className={cn(
              "absolute bottom-0 right-0 w-8 h-8 rounded-full border-4 border-white dark:border-gray-800 shadow-md",
              isAvailable ? "bg-green-500" : "bg-red-500"
            )} />
          </div>
          
          <h2 className="text-2xl font-bold">{worker.name}</h2>
          <p className="text-primary font-medium mb-2">{t(worker.profession)}</p>
          
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center gap-1 bg-yellow-400 text-white px-3 py-1 rounded-full text-sm font-bold">
              <Star size={16} fill="white" /> {worker.rating}
            </div>
            <div className={cn(
              "px-3 py-1 rounded-full text-sm font-bold text-white",
              isAvailable ? "bg-green-500" : "bg-red-500"
            )}>
              {isAvailable ? t('available') : t('unavailable')}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full mb-6">
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-2xl text-center">
              <p className="text-[10px] text-gray-500 uppercase font-bold">{t('workingHours')}</p>
              <p className="text-sm font-bold">{worker.workingHours}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-2xl text-center">
              <p className="text-[10px] text-gray-500 uppercase font-bold">{t('transport')}</p>
              <p className="text-sm font-bold">{worker.hasTransport ? t('available') : t('unavailable')}</p>
            </div>
          </div>

          {worker.description && (
            <div className="w-full mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl border-l-4 border-primary">
              <h3 className="text-sm font-bold mb-2 flex items-center gap-2">
                <Info size={16} className="text-primary" /> {t('workerDescription')}
              </h3>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                {worker.description}
              </p>
            </div>
          )}

          {worker.photos && worker.photos.length > 0 && (
            <div className="w-full mb-6">
              <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                <Camera size={16} className="text-primary" /> {t('photos')}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                {worker.photos.filter(p => !!p).map((p, idx) => (
                  <motion.div 
                    key={idx}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="aspect-square rounded-2xl overflow-hidden shadow-md border border-gray-100 dark:border-gray-700 cursor-pointer"
                    onClick={() => window.open(p, '_blank')}
                  >
                    <img src={p} alt={`Work ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {worker.specialties && worker.specialties.length > 0 && (
            <div className="w-full mb-6">
              <h3 className="text-sm font-bold mb-2">{t('specialties')}</h3>
              <div className="flex flex-wrap gap-2">
                {worker.specialties.map(s => (
                  <span key={s} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-bold">
                    {t(s)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 w-full">
            {isMyProfile ? (
              <button 
                onClick={handleToggleAvailability}
                disabled={toggling}
                className={cn(
                  "w-full py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2",
                  isAvailable 
                    ? "bg-green-500 text-white hover:bg-green-600" 
                    : "bg-red-500 text-white hover:bg-red-600"
                )}
              >
                {toggling ? <LoadingScreen /> : (
                  <>
                    <Clock size={20} /> 
                    {isAvailable ? t('youAreAvailableNow') : t('youAreUnavailableNow')}
                  </>
                )}
              </button>
            ) : (
              <button 
                onClick={() => navigate(`/book/${worker.uid}`)}
                disabled={!isAvailable}
                className={cn(
                  "w-full py-4 text-white rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2",
                  isAvailable 
                    ? "bg-primary hover:scale-[1.02]" 
                    : "bg-gray-400 cursor-not-allowed"
                )}
              >
                <Calendar size={20} /> {isAvailable ? t('bookNow') : t('workerUnavailable')}
              </button>
            )}
          </div>
        </div>
      </div>

      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Star size={20} className="text-yellow-400" /> {t('reviews')} ({reviews.length})
      </h3>

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <p className="text-center py-8 text-gray-500 italic">{t('noReviews')}</p>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3 mb-2">
                {review.customerPhoto ? (
                  <img src={review.customerPhoto} alt={review.customerName} className="w-10 h-10 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center font-bold">
                    {review.customerName.charAt(0)}
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-bold text-sm">{review.customerName}</p>
                  <p className="text-[10px] text-gray-500">{new Date(review.timestamp).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-1 bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <Star size={10} fill="currentColor" /> {review.rating}
                </div>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300">{review.comment}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const LanguageSelectionPopup = ({ onComplete }: { onComplete: (lang: string) => void }) => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);

  const handleSelect = async (lang: string) => {
    setLoading(true);
    i18n.changeLanguage(lang);
    await onComplete(lang);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-sm shadow-2xl text-center"
      >
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Globe className="text-primary" size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">اختر اللغة / Select Language / زمان هەڵبژێرە</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">Please select your preferred language</p>
        
        <div className="space-y-3">
          <button
            onClick={() => handleSelect('ar')}
            disabled={loading}
            className="w-full py-4 bg-gray-100 dark:bg-gray-700 hover:bg-primary hover:text-white dark:hover:bg-primary rounded-2xl font-bold transition-all"
          >
            العربية
          </button>
          <button
            onClick={() => handleSelect('en')}
            disabled={loading}
            className="w-full py-4 bg-gray-100 dark:bg-gray-700 hover:bg-primary hover:text-white dark:hover:bg-primary rounded-2xl font-bold transition-all"
          >
            English
          </button>
          <button
            onClick={() => handleSelect('ku')}
            disabled={loading}
            className="w-full py-4 bg-gray-100 dark:bg-gray-700 hover:bg-primary hover:text-white dark:hover:bg-primary rounded-2xl font-bold transition-all"
          >
            كوردى
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const AppContent = () => {
  const { user, profile, loading, isAuthReady } = useAuth();
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const handleProfileSetup = async (city: City, phone: string) => {
    if (!user) return;
    try {
      const updates: any = { city };
      if (phone) updates.phone = phone;
      
      // Only set name if it doesn't exist in profile
      if (!profile?.name) {
        updates.name = user.displayName || 'User';
      }
      
      await setDoc(doc(db, 'users', user.uid), updates, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  useEffect(() => {
    // Seed mock data once if admin
    const adminEmails = ['mushtaqq.rh@gmail.com', 'iraqdinosaur680@gmail.com'];
    if (isAuthReady && user && adminEmails?.includes(user.email || '')) {
      const hasSeeded = localStorage.getItem('hasSeededMockData');
      if (!hasSeeded) {
        seedMockData().then(() => {
          localStorage.setItem('hasSeededMockData', 'true');
        });
      }
    }
  }, [isAuthReady, user]);

  useEffect(() => {
    // Force admin role if email matches
    const adminEmails = ['mushtaqq.rh@gmail.com', 'iraqdinosaur680@gmail.com'];
    if (isAuthReady && user && adminEmails?.includes(user.email || '') && profile && profile.role !== 'admin') {
      setDoc(doc(db, 'users', user.uid), { role: 'admin' }, { merge: true });
    }
  }, [isAuthReady, user, profile]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    document.body.className = darkMode ? 'dark-mode blue-theme' : 'light-mode green-theme';
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  useEffect(() => {
    document.dir = ['ar', 'ku'].includes(i18n.language) ? 'rtl' : 'ltr';
  }, [i18n.language]);

  useEffect(() => {
    if (profile?.language && profile.language !== i18n.language) {
      i18n.changeLanguage(profile.language);
    }
  }, [profile?.language, i18n]);

  const handleLanguageSetup = async (lang: string) => {
    if (!user) return;
    try {
      await setDoc(doc(db, 'users', user.uid), { language: lang }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
    }
  };

  if (!isAuthReady || loading) return <LoadingScreen />;
  
  const isPublicPage = ['/privacy', '/terms'].includes(location.pathname);

  if (!user && !isPublicPage) return <AuthPage />;

  const showProfileSetup = !profile || !profile.city || !profile.phone;
  const showLanguageSetup = !showProfileSetup && profile && !profile.language;

  return (
    <div className="min-h-screen flex flex-col">
      <NotificationManager />
      {user && <Header darkMode={darkMode} setDarkMode={setDarkMode} />}
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/category/:categoryId" element={<CategoryWorkersPage />} />
          <Route path="/worker/:workerId" element={<WorkerProfilePage />} />
          <Route path="/book/:workerId" element={<BookingPage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/apply" element={<WorkerApplicationPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/admin" element={profile?.role === 'admin' ? <AdminDashboard /> : <Navigate to="/" />} />
          <Route path="/chat/:bookingId" element={<ChatPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      {user && <BottomNav />}
      {showProfileSetup && <ProfileSetupPopup onComplete={handleProfileSetup} />}
      {showLanguageSetup && <LanguageSelectionPopup onComplete={handleLanguageSetup} />}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  );
}
