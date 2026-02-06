import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Sparkles, Star, Copy, Check, ArrowRight, Zap, Shield, RefreshCw, Mail, MessageSquare, User, AlertCircle, History, Clock, Trash2, RotateCcw, LogOut, UserCircle, X, PartyPopper } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { AuthModals } from './components/AuthModals';
import { ThemeToggle, ThemeFab } from './components/ThemeToggle';
import logo from 'figma:asset/2d046533a292fce0e8c6f0953a21393852b873e7.png';
import { FirebaseError } from 'firebase/app';
import { signInWithPopup, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import { auth, googleProvider } from './firebase/config';
import { fetchHistoryEntries, saveHistoryEntry, deleteHistoryEntryFromFirestore, HistoryEntryDocument } from './services/history';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Confetti colors
const CONFETTI_COLORS = ['#8B7AE8', '#7062D4', '#f472b6', '#22c55e', '#fbbf24', '#60a5fa', '#a78bfa'];

// Create confetti burst effect
const createConfetti = () => {
  const confettiCount = 50;
  const container = document.body;
  
  for (let i = 0; i < confettiCount; i++) {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = `${Math.random() * 100}vw`;
    confetti.style.backgroundColor = CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)];
    confetti.style.animationDuration = `${2 + Math.random() * 2}s`;
    confetti.style.animationDelay = `${Math.random() * 0.5}s`;
    confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
    confetti.style.width = `${8 + Math.random() * 8}px`;
    confetti.style.height = `${8 + Math.random() * 8}px`;
    confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
    container.appendChild(confetti);
    
    setTimeout(() => confetti.remove(), 3500);
  }
};

// Create particle burst effect
const createParticleBurst = (x: number, y: number, color: string = '#8B7AE8') => {
  const particleCount = 12;
  const container = document.body;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    const angle = (i / particleCount) * Math.PI * 2;
    const distance = 50 + Math.random() * 50;
    particle.style.left = `${x}px`;
    particle.style.top = `${y}px`;
    particle.style.backgroundColor = color;
    particle.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
    particle.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
    container.appendChild(particle);
    
    setTimeout(() => particle.remove(), 800);
  }
};

// AI Detection types
interface TextSegment {
  text: string;
  aiProbability: number; // 0-1
}

interface DetectionResult {
  score: number; // 0-100
  analysis: string;
  segments?: TextSegment[];
}

// History Entry type
interface HistoryEntry {
  id: string;
  inputText: string;
  outputText: string;
  tone: string;
  inputAIPercentage: number;
  outputAIPercentage: number;
  timestamp: number;
}

// User type
interface User {
  uid: string;
  name: string;
  email: string;
}

// Get color for AI probability
const getAIHighlightColor = (probability: number): string => {
  if (probability >= 0.7) return 'bg-red-200/60 dark:bg-red-900/40'; // High AI
  if (probability >= 0.4) return 'bg-orange-200/60 dark:bg-orange-900/40'; // Medium AI
  if (probability >= 0.2) return 'bg-yellow-200/60 dark:bg-yellow-900/40'; // Low-Medium AI
  return 'bg-green-200/40 dark:bg-green-900/40'; // Likely Human
};

interface ToneOption {
  value: string;
  label: string;
  icon: LucideIcon;
  description: string;
}

const toneIconMap: Record<string, LucideIcon> = {
  natural: User,
  casual: MessageSquare,
  professional: Shield,
  creative: Zap,
  concise: AlertCircle,
};

const defaultToneOptions: ToneOption[] = [
  { value: 'natural', label: 'Natural', icon: User, description: 'Balanced & authentic' },
  { value: 'casual', label: 'Casual', icon: MessageSquare, description: 'Friendly & relaxed' },
  { value: 'professional', label: 'Professional', icon: Shield, description: 'Polished & formal' },
  { value: 'creative', label: 'Creative', icon: Zap, description: 'Expressive & unique' },
  { value: 'concise', label: 'Concise', icon: AlertCircle, description: 'Clear & to the point' },
];

const features = [
  { icon: Zap, title: 'Instant Results', description: 'Get humanized text in seconds' },
  { icon: Shield, title: 'Natural Flow', description: 'Authentic, engaging content' },
  { icon: RefreshCw, title: 'Multiple Styles', description: 'Adapt to any tone you need' },
];

const GOOGLE_AUTH_MODE_KEY = 'humality_google_mode';

const mapHistoryDocumentToEntry = (doc: HistoryEntryDocument): HistoryEntry => {
  return {
    id: doc.id,
    inputText: doc.inputText,
    outputText: doc.outputText,
    tone: doc.tone,
    inputAIPercentage: doc.inputAIPercentage || 0,
    outputAIPercentage: doc.outputAIPercentage || 0,
    timestamp: doc.createdAt ? doc.createdAt.toMillis() : Date.now(),
  };
};

const mapFirebaseUser = (firebaseUser: FirebaseAuthUser | null): User | null => {
  if (!firebaseUser) return null;
  return {
    uid: firebaseUser.uid,
    name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Humality User',
    email: firebaseUser.email || 'unknown@user.com',
  };
};

const getAuthErrorMessage = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'Invalid email or password.';
      case 'auth/user-not-found':
        return 'No user found with that email.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/popup-closed-by-user':
        return 'Google sign-in was canceled.';
      default:
        return error.message || 'Authentication failed. Please try again.';
    }
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Something went wrong. Please try again.';
};

export default function App() {
  const [toneOptions, setToneOptions] = useState<ToneOption[]>(defaultToneOptions);
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [displayedOutput, setDisplayedOutput] = useState('');
  const [shouldAnimateOutput, setShouldAnimateOutput] = useState(false);
  const [isAnimatingOutput, setIsAnimatingOutput] = useState(false);
  const [tone, setTone] = useState('natural');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [copied, setCopied] = useState(false);
  const [inputAIAnalysis, setInputAIAnalysis] = useState<DetectionResult | null>(null);
  const [outputAIAnalysis, setOutputAIAnalysis] = useState<DetectionResult | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionTimeout, setDetectionTimeout] = useState<number | null>(null);

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Auth form states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isSignupLoading, setIsSignupLoading] = useState(false);
  const outputAnimationTimeoutRef = useRef<number | null>(null);
  
  // Interactive UI states
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const outputCardRef = useRef<HTMLDivElement>(null);
  
  // Motion values for 3D tilt effect
  const cardX = useMotionValue(0);
  const cardY = useMotionValue(0);
  const outputCardX = useMotionValue(0);
  const outputCardY = useMotionValue(0);
  
  // Spring physics for smoother tilt
  const springConfig = { damping: 25, stiffness: 300 };
  const cardRotateX = useSpring(useTransform(cardY, [-0.5, 0.5], [8, -8]), springConfig);
  const cardRotateY = useSpring(useTransform(cardX, [-0.5, 0.5], [-8, 8]), springConfig);
  const outputCardRotateX = useSpring(useTransform(outputCardY, [-0.5, 0.5], [8, -8]), springConfig);
  const outputCardRotateY = useSpring(useTransform(outputCardX, [-0.5, 0.5], [-8, 8]), springConfig);
  
  // Handle card 3D tilt
  const handleCardMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>, isOutput: boolean = false) => {
    const card = isOutput ? outputCardRef.current : cardRef.current;
    if (!card) return;
    
    const rect = card.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = (e.clientX - centerX) / (rect.width / 2);
    const y = (e.clientY - centerY) / (rect.height / 2);
    
    if (isOutput) {
      outputCardX.set(x);
      outputCardY.set(y);
    } else {
      cardX.set(x);
      cardY.set(y);
    }
  }, [cardX, cardY, outputCardX, outputCardY]);
  
  const handleCardMouseLeave = useCallback((isOutput: boolean = false) => {
    if (isOutput) {
      outputCardX.set(0);
      outputCardY.set(0);
    } else {
      cardX.set(0);
      cardY.set(0);
    }
  }, [cardX, cardY, outputCardX, outputCardY]);
  
  // Handle ripple effect
  const createRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const rect = button.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    ripple.className = 'ripple';
    button.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }, []);

  // Debounced AI Detection for Input
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    
    if (detectionTimeout) {
      window.clearTimeout(detectionTimeout);
    }

    if (text.trim().length < 10) {
      setInputAIAnalysis(null);
      setIsDetecting(false);
      return;
    }

    setIsDetecting(true);
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/detect-ai`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (response.ok) {
          const data = await response.json();
          setInputAIAnalysis(data);
        }
      } catch (error) {
        console.error('Real-time detection error:', error);
      } finally {
        setIsDetecting(false);
      }
    }, 1000); // 1 second debounce
    
    setDetectionTimeout(timeout);
  };

  const handleConvert = async () => {
    if (!inputText.trim()) {
      toast.error('Please enter some text to humanize');
      return;
    }
    
    setIsConverting(true);
    setRating(0);
    if (outputAnimationTimeoutRef.current) {
      window.clearTimeout(outputAnimationTimeoutRef.current);
      outputAnimationTimeoutRef.current = null;
    }
    setOutputText('');
    setDisplayedOutput('');
    setShouldAnimateOutput(false);
    setIsAnimatingOutput(false);
    setOutputAIAnalysis(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/humanize-with-detection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText, tone }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.detail || 'Failed to humanize text. Please try again.');
      }

      const data = await response.json();
      const humanized = data.humanized_text;
      
      setShouldAnimateOutput(true);
      setOutputText(humanized);
      setInputText(inputText); // Ensure input text stays
      setInputAIAnalysis(data.input_detection);
      setOutputAIAnalysis(data.output_detection);
      
      // Add to history (persist if signed in)
      let historyEntryId: string | null = null;
      if (user?.uid) {
        try {
          historyEntryId = await saveHistoryEntry({
            uid: user.uid,
            inputText,
            outputText: humanized,
            tone,
            inputAIPercentage: data.input_detection.score,
            outputAIPercentage: data.output_detection.score,
          });
        } catch (error) {
          console.error('Failed to save history entry', error);
          toast.error('Saved conversion locally, but syncing to the cloud failed.');
        }
      }

      if (user?.uid) {
        const newEntry: HistoryEntry = {
          id: historyEntryId ?? Date.now().toString(),
          inputText,
          outputText: humanized,
          tone,
          inputAIPercentage: data.input_detection.score,
          outputAIPercentage: data.output_detection.score,
          timestamp: Date.now(),
        };
        setHistory((prev) => [newEntry, ...prev]);
      }
      
      // Celebrate with confetti! 🎉
      createConfetti();
      setShowSuccessCelebration(true);
      setTimeout(() => setShowSuccessCelebration(false), 3000);
      
      toast.success('Text humanized and analyzed successfully!');
    } catch (error) {
      console.error('Humanization failed', error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong while humanizing your text.');
    } finally {
      setIsConverting(false);
      setIsDetecting(false);
    }
  };

  const restoreFromHistory = (entry: HistoryEntry) => {
    setInputText(entry.inputText);
    setOutputText(entry.outputText);
    setDisplayedOutput(entry.outputText);
    setShouldAnimateOutput(false);
    setIsAnimatingOutput(false);
    setTone(entry.tone);
    // We don't have full analysis for history items, so we mock the structure with just the score
    setInputAIAnalysis({ score: entry.inputAIPercentage, analysis: 'Restored from history' });
    setOutputAIAnalysis({ score: entry.outputAIPercentage, analysis: 'Restored from history' });
    setShowHistory(false);
    toast.success('History restored!');
  };

  const deleteHistoryEntry = async (id: string) => {
    if (user?.uid) {
      const uid = user.uid;
      try {
        await deleteHistoryEntryFromFirestore(uid, id);
      } catch (error) {
        console.error('Failed to delete history entry', error);
        toast.error('Unable to delete entry right now.');
        return;
      }
    }
    setHistory((prev) => prev.filter(entry => entry.id !== id));
    toast.success('History entry deleted');
  };

  const clearAllHistory = async () => {
    if (history.length === 0) {
      setShowHistory(false);
      return;
    }

    if (user?.uid) {
      const uid = user.uid;
      try {
        await Promise.all(history.map(entry => deleteHistoryEntryFromFirestore(uid, entry.id)));
      } catch (error) {
        console.error('Failed to clear history', error);
        toast.error('Unable to clear history right now.');
        return;
      }
    }

    setHistory([]);
    setShowHistory(false);
    toast.success('History cleared');
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginEmail || !loginPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    
    setIsLoginLoading(true);
    try {
      const credentials = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const mapped = mapFirebaseUser(credentials.user);
      if (mapped) {
        setUser(mapped);
        toast.success(`Welcome back, ${mapped.name}!`);
      } else {
        toast.success('Welcome back!');
      }
      setShowLoginModal(false);
      setLoginEmail('');
      setLoginPassword('');
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setIsLoginLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signupName || !signupEmail || !signupPassword) {
      toast.error('Please fill in all fields');
      return;
    }
    
    if (signupPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setIsSignupLoading(true);
    try {
      const credentials = await createUserWithEmailAndPassword(auth, signupEmail, signupPassword);
      if (signupName.trim()) {
        await updateProfile(credentials.user, { displayName: signupName.trim() });
      }
      const mapped = mapFirebaseUser(credentials.user);
      if (mapped) {
        setUser(mapped);
        toast.success(`Welcome to Humality, ${mapped.name}!`);
      } else {
        toast.success('Account created successfully!');
      }
      setShowSignupModal(false);
      setSignupName('');
      setSignupEmail('');
      setSignupPassword('');
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setIsSignupLoading(false);
    }
  };

  const handleGoogleAuth = async (mode: 'login' | 'signup') => {
    setIsGoogleLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      window.localStorage.removeItem(GOOGLE_AUTH_MODE_KEY);
      setShowLoginModal(false);
      setShowSignupModal(false);
      toast.success(mode === 'login' ? 'Logged in with Google!' : 'Signed up with Google!');
    } catch (error) {
      if (error instanceof FirebaseError && error.code === 'auth/popup-blocked') {
        try {
          window.localStorage.setItem(GOOGLE_AUTH_MODE_KEY, mode);
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError) {
          console.error('Google redirect failed', redirectError);
          toast.error(getAuthErrorMessage(redirectError));
        }
      } else {
        toast.error(getAuthErrorMessage(error));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error(getAuthErrorMessage(error));
    } finally {
      setShowUserMenu(false);
    }
  };

  const toggleHistoryPanel = () => {
    if (!user) {
      toast.error('Sign in to view your conversion history.');
      return;
    }
    setShowHistory((prev) => !prev);
  };

  const handleCopy = async () => {
    if (!outputText.trim()) {
      toast.error('Nothing to copy!');
      return;
    }
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleRating = (value: number) => {
    setRating(value);
    toast.success(`Thanks for rating ${value} star${value !== 1 ? 's' : ''}!`);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      const mapped = mapFirebaseUser(firebaseUser);
      if (mapped) {
        setUser(mapped);
        setIsHistoryLoading(true);
        try {
          const entries = await fetchHistoryEntries(mapped.uid);
          const mapped_entries = entries.map(mapHistoryDocumentToEntry);
          setHistory(mapped_entries);
        } catch (error) {
          console.error('Failed to load history', error);
          toast.error('Could not load your history at this time.');
        } finally {
          setIsHistoryLoading(false);
        }
      } else {
        setUser(null);
        setHistory([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleGetRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          const mapped = mapFirebaseUser(result.user);
          if (mapped) {
            setUser(mapped);
            toast.success(`Welcome, ${mapped.name}!`);
          }
        }
      } catch (error) {
        if (error instanceof FirebaseError && error.code !== 'auth/no-redirect-result') {
          toast.error(getAuthErrorMessage(error));
        }
      }
    };

    handleGetRedirectResult();
  }, []);

  // Output text animation effect
  useEffect(() => {
    if (outputAnimationTimeoutRef.current) {
      window.clearTimeout(outputAnimationTimeoutRef.current);
      outputAnimationTimeoutRef.current = null;
    }

    if (!outputText) {
      setDisplayedOutput('');
      setIsAnimatingOutput(false);
      setShouldAnimateOutput(false);
      return;
    }

    if (!shouldAnimateOutput) {
      setDisplayedOutput(outputText);
      setIsAnimatingOutput(false);
      return;
    }

    setDisplayedOutput('');
    setIsAnimatingOutput(true);
    let index = 0;

    const animate = () => {
      index += 1;
      setDisplayedOutput(outputText.slice(0, index));
      if (index < outputText.length) {
        outputAnimationTimeoutRef.current = window.setTimeout(animate, 12);
      } else {
        setIsAnimatingOutput(false);
        setShouldAnimateOutput(false);
      }
    };

    outputAnimationTimeoutRef.current = window.setTimeout(animate, 20);

    return () => {
      if (outputAnimationTimeoutRef.current) {
        window.clearTimeout(outputAnimationTimeoutRef.current);
        outputAnimationTimeoutRef.current = null;
      }
    };
  }, [outputText, shouldAnimateOutput]);

  const inputCharCount = inputText.length;
  const outputCharCount = outputText.length;

  return (
    <div className="relative z-10 min-h-screen bg-gradient-to-br from-brand-50 via-brand-50 to-brand-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-900 overflow-hidden transition-colors duration-300">
      {/* Animated background elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        {/* Large morphing blobs */}
        <motion.div
          className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-brand-300 to-brand-500 dark:from-brand-600 dark:to-brand-800 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-30 morph-blob"
          animate={{
            x: [0, 100, 50, 0],
            y: [0, 50, 100, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-pink-300 to-purple-500 dark:from-pink-700 dark:to-purple-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-25 morph-blob"
          animate={{
            x: [0, -100, -50, 0],
            y: [0, -50, -100, 0],
            scale: [1, 0.9, 1.1, 1],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute top-1/3 left-1/3 w-72 h-72 bg-gradient-to-br from-cyan-300 to-blue-500 dark:from-cyan-700 dark:to-blue-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 morph-blob"
          animate={{
            x: [0, 60, -40, 0],
            y: [0, -80, 60, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{
            duration: 22,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5
          }}
        />
        
        {/* Floating particles */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-brand-500/40 dark:bg-brand-400/40 rounded-full"
            style={{
              left: `${10 + i * 12}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -30, 0],
              x: [0, i % 2 === 0 ? 20 : -20, 0],
              opacity: [0.2, 0.6, 0.2],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 4 + i * 0.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.3
            }}
          />
        ))}
        
        {/* Sparkle effects */}
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={`sparkle-${i}`}
            className="absolute w-1 h-1 bg-yellow-400/60 rounded-full"
            style={{
              left: `${20 + i * 18}%`,
              top: `${15 + i * 15}%`,
            }}
            animate={{
              opacity: [0, 1, 0],
              scale: [0, 1.5, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.8
            }}
          />
        ))}
      </div>

      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-white/70 dark:bg-gray-900/80 backdrop-blur-md border-b border-brand-200/50 dark:border-gray-700/50 sticky top-0 z-50 shadow-sm dark:shadow-lg transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <motion.div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => setActiveSection('home')}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <img src={logo} alt="Humality Logo" className="w-11 h-11" />
              <div>
                <span className="text-gray-900 dark:text-white block leading-tight">Humality</span>
                <span className="text-brand-600 dark:text-brand-400 block leading-tight" style={{ fontSize: '0.7rem' }}>AI Text Humanizer</span>
              </div>
            </motion.div>
            <div className="flex items-center gap-3">
              <nav className="flex gap-1 sm:gap-2 items-center">
                <ThemeToggle />
                {activeSection === 'home' && user && (
                  <motion.button
                    onClick={toggleHistoryPanel}
                    className={`px-3 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 ${
                      showHistory
                        ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30 dark:from-brand-600 dark:to-brand-700'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <History className="w-4 h-4" />
                    <span className="hidden sm:inline">History</span>
                  {history.length > 0 && (
                    <Badge className="bg-white text-brand-600 border-0 h-5 w-5 p-0 flex items-center justify-center">
                      {history.length}
                    </Badge>
                  )}
                </motion.button>
              )}
                {['home', 'about', 'contact'].map((section) => (
                  <motion.button
                    key={section}
                    onClick={() => setActiveSection(section)}
                    className={`px-4 py-2 rounded-lg transition-all ${
                      activeSection === section
                        ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30 dark:from-brand-600 dark:to-brand-700'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/10'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {section.charAt(0).toUpperCase() + section.slice(1)}
                  </motion.button>
                ))}
              </nav>

              {!user ? (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-gray-700 hover:text-gray-900 hover:bg-white/70"
                    onClick={() => setShowLoginModal(true)}
                  >
                    Log in
                  </Button>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-brand-500/30 shadow-lg hover:from-brand-600 hover:to-brand-700"
                    onClick={() => setShowSignupModal(true)}
                  >
                    Sign up
                  </Button>
                </div>
              ) : (
                <div className="relative">
                  <motion.button
                    onClick={() => setShowUserMenu(prev => !prev)}
                    className="flex items-center gap-2 px-3 py-2 rounded-full border border-brand-200 bg-white/80 text-gray-700 hover:text-gray-900 shadow-sm"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                  >
                    <UserCircle className="w-5 h-5 text-brand-600" />
                    <span className="max-w-[100px] truncate text-sm">{user.name}</span>
                  </motion.button>
                  <AnimatePresence>
                    {showUserMenu && (
                      <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-3 w-56 rounded-2xl border border-gray-100 bg-white shadow-2xl p-4 z-50 space-y-3"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-900">Signed in as</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        <Button
                          variant="ghost"
                          className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={handleLogout}
                        >
                          <LogOut className="w-4 h-4" />
                          Log out
                        </Button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12 relative z-10">
        <AnimatePresence mode="wait">
          {activeSection === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Hero Section */}
              <div className="text-center mb-12 sm:mb-16">
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <Badge className="mb-6 bg-gradient-to-r from-brand-500 via-brand-600 to-brand-500 text-white border-0 px-6 py-2 text-sm font-medium shadow-lg shadow-brand-500/30 animate-pulse">
                      ✨ AI-Powered Text Transformation
                    </Badge>
                  </motion.div>
                  <motion.h1 
                    className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 animated-gradient-text glow-text"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                  >
                    Making AI Text Feel Human
                  </motion.h1>
                  <motion.p 
                    className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8 text-lg leading-relaxed"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    Transform your AI-generated content into natural, engaging text that resonates with your audience. 
                    Choose your tone, click convert, and watch the <span className="text-brand-600 font-semibold">magic</span> happen.
                  </motion.p>
                  {/* Floating decorative elements */}
                  <div className="relative h-0">
                    <motion.div
                      className="absolute -left-20 -top-20 w-16 h-16 bg-gradient-to-br from-brand-400/30 to-brand-600/30 rounded-full blur-xl"
                      animate={{ 
                        y: [0, -20, 0],
                        scale: [1, 1.2, 1],
                        opacity: [0.5, 0.8, 0.5]
                      }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                      className="absolute -right-20 -top-10 w-20 h-20 bg-gradient-to-br from-pink-400/30 to-purple-600/30 rounded-full blur-xl"
                      animate={{ 
                        y: [0, 20, 0],
                        scale: [1, 1.3, 1],
                        opacity: [0.4, 0.7, 0.4]
                      }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    />
                  </div>
                </motion.div>
              </div>

              {/* Tone Selection */}
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label className="text-gray-800 dark:text-gray-200 mb-4 block text-center font-medium">Select Your Tone</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 max-w-6xl mx-auto">
                  {toneOptions.map((option, index) => (
                    <motion.button
                      key={option.value}
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        createParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, tone === option.value ? '#8B7AE8' : '#22c55e');
                        setTone(option.value);
                      }}
                      className={`p-4 sm:p-5 rounded-2xl border-2 transition-all w-full relative overflow-hidden ${
                        tone === option.value
                          ? 'bg-gradient-to-br from-brand-500 to-brand-600 border-brand-600 text-white shadow-xl shadow-brand-500/40 neon-border'
                          : 'bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-brand-200/50 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-brand-400'
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ 
                        y: -10,
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)"
                      }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ 
                        delay: 0.25 + index * 0.05,
                        duration: 0.2,
                        ease: "easeOut"
                      }}
                    >
                      <option.icon className={`w-6 h-6 mx-auto mb-2 ${tone === option.value ? 'text-white' : 'text-brand-600 dark:text-white'}`} />
                      <div className={tone === option.value ? 'text-white' : 'text-gray-900 dark:text-white'}>{option.label}</div>
                      <div className={`mt-1 ${tone === option.value ? 'text-brand-100' : 'text-gray-500 dark:text-white/70'}`} style={{ fontSize: '0.8rem' }}>
                        {option.description}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </motion.div>

              {/* Converter Section */}
              <motion.div
                className="grid lg:grid-cols-2 gap-6 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {/* Input Section */}
                <motion.div
                  ref={cardRef}
                  style={{
                    rotateX: cardRotateX,
                    rotateY: cardRotateY,
                    transformStyle: 'preserve-3d',
                    perspective: 1000,
                  }}
                  onMouseMove={(e) => handleCardMouseMove(e, false)}
                  onMouseLeave={() => handleCardMouseLeave(false)}
                >
                <Card className="glass-panel p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border-brand-200/50 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <label className="text-gray-800 dark:text-gray-200 font-medium">AI-Generated Text</label>
                      {isDetecting ? (
                        <Badge className="bg-gray-400 text-white border-0 animate-pulse">
                          Analyzing...
                        </Badge>
                      ) : inputAIAnalysis ? (
                        <Badge 
                          className={`${
                            inputAIAnalysis.score >= 70 ? 'bg-red-500' :
                            inputAIAnalysis.score >= 40 ? 'bg-orange-500' :
                            inputAIAnalysis.score >= 20 ? 'bg-yellow-500' :
                            'bg-green-500'
                          } text-white border-0 shadow-md`}
                        >
                          {inputAIAnalysis.score}% AI
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-400 border-gray-200 dark:border-gray-700">
                          Detection Ready
                        </Badge>
                      )}
                    </div>
                    <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: '0.875rem' }}>
                      {inputCharCount} characters
                    </span>
                  </div>
                  <Textarea
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Paste or type your AI-generated text here... Start typing to see AI detection analysis."
                    className="min-h-[280px] resize-none bg-white/80 dark:bg-gray-900/50 border-brand-300/50 dark:border-gray-600 focus:border-brand-500 focus:ring-brand-500/20 rounded-xl dark:text-gray-100"
                  />
                  
                  {/* AI Detection Highlight View */}
                  {inputAIAnalysis && (
                    <motion.div 
                      className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 max-h-[200px] overflow-y-auto"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                        <span className="text-gray-700 dark:text-gray-300" style={{ fontSize: '0.875rem' }}>AI Detection Analysis</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 italic">
                        {inputAIAnalysis.analysis}
                      </p>
                      {inputAIAnalysis.segments && inputAIAnalysis.segments.length > 0 && (
                        <div className="space-y-1">
                          {inputAIAnalysis.segments.map((segment, index) => (
                            <span
                              key={index}
                              className={`inline ${getAIHighlightColor(segment.aiProbability)} px-1 py-0.5 rounded transition-colors dark:text-gray-100`}
                              title={`${Math.round(segment.aiProbability * 100)}% AI probability`}
                            >
                              {segment.text}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Color Legend */}
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50 grid grid-cols-2 sm:grid-cols-4 gap-2" style={{ fontSize: '0.7rem' }}>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-red-200/60 dark:bg-red-900/40 rounded-full ring-1 ring-red-400/20"></div>
                          <span className="text-gray-500 dark:text-gray-400 font-medium">High (70%+)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-orange-200/60 dark:bg-orange-900/40 rounded-full ring-1 ring-orange-400/20"></div>
                          <span className="text-gray-500 dark:text-gray-400 font-medium">Medium (40-70%)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-yellow-200/60 dark:bg-yellow-900/40 rounded-full ring-1 ring-yellow-400/20"></div>
                          <span className="text-gray-500 dark:text-gray-400 font-medium">Low (20-40%)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-green-200/40 dark:bg-green-900/40 rounded-full ring-1 ring-green-400/20"></div>
                          <span className="text-gray-500 dark:text-gray-400 font-medium">Human (&lt;20%)</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </Card>
                </motion.div>

                {/* Output Section */}
                <motion.div
                  ref={outputCardRef}
                  style={{
                    rotateX: outputCardRotateX,
                    rotateY: outputCardRotateY,
                    transformStyle: 'preserve-3d',
                    perspective: 1000,
                  }}
                  onMouseMove={(e) => handleCardMouseMove(e, true)}
                  onMouseLeave={() => handleCardMouseLeave(true)}
                >
                <Card className={`glass-panel p-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border-brand-200/50 dark:border-gray-700 shadow-xl hover:shadow-2xl transition-all duration-300 relative ${showSuccessCelebration ? 'rainbow-border' : ''}`}
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <label className="text-gray-800 dark:text-gray-200 font-medium">Humanized Text</label>
                      {outputAIAnalysis ? (
                        <Badge 
                          className={`${
                            outputAIAnalysis.score >= 70 ? 'bg-red-500' :
                            outputAIAnalysis.score >= 40 ? 'bg-orange-500' :
                            outputAIAnalysis.score >= 20 ? 'bg-yellow-500' :
                            'bg-green-500'
                          } text-white border-0 shadow-md`}
                        >
                          {outputAIAnalysis.score}% AI
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-gray-400 border-gray-200 dark:border-gray-700">
                          AI Score
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 dark:text-gray-400" style={{ fontSize: '0.875rem' }}>
                        {outputCharCount} characters
                      </span>
                      {outputText && (
                        <motion.button
                          onClick={handleCopy}
                          className="p-2 rounded-lg bg-brand-100 hover:bg-brand-200 dark:bg-brand-900/50 dark:hover:bg-brand-900 text-brand-700 dark:text-brand-300 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </motion.button>
                      )}
                    </div>
                  </div>
                  <div className="relative">
                    <Textarea
                      value={displayedOutput}
                      readOnly
                      placeholder="Your humanized text will appear here... Click the convert button below to get started."
                      className={`min-h-[280px] resize-none bg-white/80 dark:bg-gray-900/50 border-brand-300/50 dark:border-gray-600 rounded-xl transition-all dark:text-gray-100 ${isAnimatingOutput ? 'ring-2 ring-brand-400 shadow-lg shadow-brand-200/40' : ''}`}
                    />
                    {/* Typing cursor */}
                    {isAnimatingOutput && (
                      <motion.span 
                        className="typing-cursor absolute"
                        style={{ 
                          bottom: '1rem', 
                          right: '1rem',
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      />
                    )}
                  </div>
                  
                  {/* AI Detection Highlight View */}
                  {outputAIAnalysis && (
                    <motion.div 
                      className="mt-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-700 max-h-[200px] overflow-y-auto"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-gray-700 dark:text-gray-300" style={{ fontSize: '0.875rem' }}>AI Detection Analysis</span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 italic">
                        {outputAIAnalysis.analysis}
                      </p>
                      {outputAIAnalysis.segments && outputAIAnalysis.segments.length > 0 && (
                        <div className="space-y-1">
                          {outputAIAnalysis.segments.map((segment, index) => (
                            <span
                              key={index}
                              className={`inline ${getAIHighlightColor(segment.aiProbability)} px-1 py-0.5 rounded transition-colors dark:text-gray-100`}
                              title={`${Math.round(segment.aiProbability * 100)}% AI probability`}
                            >
                              {segment.text}
                            </span>
                          ))}
                        </div>
                      )}
                      {/* Color Legend */}
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700/50 grid grid-cols-2 sm:grid-cols-4 gap-2" style={{ fontSize: '0.7rem' }}>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-red-200/60 dark:bg-red-900/40 rounded-full ring-1 ring-red-400/20"></div>
                          <span className="text-gray-500 dark:text-gray-400 font-medium">High (70%+)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-orange-200/60 dark:bg-orange-900/40 rounded-full ring-1 ring-orange-400/20"></div>
                          <span className="text-gray-500 dark:text-gray-400 font-medium">Medium (40-70%)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-yellow-200/60 dark:bg-yellow-900/40 rounded-full ring-1 ring-yellow-400/20"></div>
                          <span className="text-gray-500 dark:text-gray-400 font-medium">Low (20-40%)</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 bg-green-200/40 dark:bg-green-900/40 rounded-full ring-1 ring-green-400/20"></div>
                          <span className="text-gray-500 dark:text-gray-400 font-medium">Human (&lt;20%)</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* Rating Section */}
                  <AnimatePresence>
                    {outputText && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-6 mt-6 border-t border-brand-200 dark:border-gray-700"
                      >
                        <label className="text-gray-800 dark:text-gray-200 mb-3 block font-medium">How did we do?</label>
                        <div className="flex gap-3 items-center">
                          {[1, 2, 3, 4, 5].map((star, index) => (
                            <motion.button
                              key={star}
                              onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                if (star >= 4) {
                                  createConfetti();
                                }
                                createParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, '#fbbf24');
                                handleRating(star);
                              }}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              className="relative"
                              initial={{ opacity: 0, scale: 0 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.1 + index * 0.05, type: "spring", stiffness: 300 }}
                              whileHover={{ 
                                scale: 1.3, 
                                rotate: [0, -15, 15, 0],
                                transition: { duration: 0.3 }
                              }}
                              whileTap={{ scale: 0.8 }}
                            >
                              <Star
                                className={`w-10 h-10 transition-all duration-300 ${
                                  star <= (hoverRating || rating)
                                    ? 'fill-yellow-400 text-yellow-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                              />
                              {star <= (hoverRating || rating) && (
                                <motion.div
                                  className="absolute inset-0 bg-yellow-400/20 rounded-full blur-md"
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1.5 }}
                                  transition={{ duration: 0.3 }}
                                />
                              )}
                            </motion.button>
                          ))}
                          {rating > 0 && (
                            <motion.span
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="ml-2 text-gray-600 dark:text-gray-400 text-sm"
                            >
                              {rating === 5 ? '🎉 Amazing!' : rating >= 4 ? '😊 Great!' : rating >= 3 ? '👍 Good' : rating >= 2 ? '😐 Okay' : '😔 Poor'}
                            </motion.span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
                </motion.div>
              </motion.div>

              {/* Convert Button */}
              <motion.div
                className="flex justify-center mb-16"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <motion.div 
                  whileHover={{ scale: 1.08 }} 
                  whileTap={{ scale: 0.92 }}
                  className="magnetic-button"
                >
                  <Button
                    onClick={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      createParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
                      createRipple(e);
                      handleConvert();
                    }}
                    disabled={!inputText.trim() || isConverting}
                    className={`bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700 hover:from-brand-600 hover:via-brand-700 hover:to-brand-700 text-white px-16 py-7 rounded-2xl shadow-2xl shadow-brand-500/40 hover:shadow-brand-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group ripple-container ${isConverting ? 'pulse-glow' : ''}`}
                  >
                    {/* Animated gradient shine */}
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/30 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                    {/* Glow effect */}
                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-t from-white/0 via-white/10 to-white/20 rounded-2xl" />
                    {isConverting ? (
                      <span className="flex items-center gap-3 relative z-10">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                        >
                          <RefreshCw className="w-6 h-6" />
                        </motion.div>
                        <span className="animated-gradient-text font-semibold">Converting...</span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-3 relative z-10">
                        <motion.div
                          animate={{ rotate: [0, 15, -15, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <Sparkles className="w-6 h-6" />
                        </motion.div>
                        <span className="font-semibold">Humanize Text</span>
                        <motion.div
                          animate={{ x: [0, 5, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <ArrowRight className="w-5 h-5" />
                        </motion.div>
                      </span>
                    )}
                  </Button>
                </motion.div>
              </motion.div>

              {/* Success Celebration Overlay */}
              <AnimatePresence>
                {showSuccessCelebration && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="fixed inset-0 pointer-events-none flex items-center justify-center z-50"
                  >
                    <motion.div
                      className="bg-gradient-to-br from-brand-500 to-brand-600 text-white px-8 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
                      animate={{ 
                        scale: [1, 1.1, 1],
                        rotate: [0, -2, 2, 0]
                      }}
                      transition={{ duration: 0.5 }}
                    >
                      <PartyPopper className="w-8 h-8" />
                      <span className="text-xl font-bold">Successfully Humanized! 🎉</span>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Features Grid - Moved to bottom */}
              <motion.div
                className="grid sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto stagger-children"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    className="glass-panel bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-brand-200/50 shadow-lg hover-lift group cursor-pointer"
                    whileHover={{ 
                      y: -12,
                      boxShadow: "0 25px 50px rgba(139, 122, 232, 0.25)"
                    }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ 
                      duration: 0.3,
                      ease: [0.34, 1.56, 0.64, 1]
                    }}
                  >
                    <motion.div
                      className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-brand-500/30"
                      whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <feature.icon className="w-8 h-8 text-white" />
                    </motion.div>
                    <h3 className="text-gray-900 mb-2 group-hover:text-brand-600 transition-colors">{feature.title}</h3>
                    <p className="text-gray-600 group-hover:text-gray-700 transition-colors">{feature.description}</p>
                    {/* Decorative glow */}
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-brand-500/0 to-brand-600/0 group-hover:from-brand-500/5 group-hover:to-brand-600/10 transition-all duration-300 pointer-events-none" />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {activeSection === 'about' && (
            <motion.div
              key="about"
              className="max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass-panel p-8 sm:p-12 bg-white/70 backdrop-blur-md border-brand-200/50 shadow-2xl">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <img src={logo} alt="Humality Logo" className="w-16 h-16" />
                    <div className="flex flex-col gap-2">
                      <Badge className="bg-gradient-to-r from-brand-500 to-brand-600 text-white border-0 w-fit">
                        Student Created
                      </Badge>
                      <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white border-0 w-fit">
                        Free to Use
                      </Badge>
                    </div>
                  </div>
                  <h2 className="text-gray-900 mb-6">About Humality</h2>
                </motion.div>
                <motion.div
                  className="space-y-5 text-gray-600"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <p>
                    Humality is a cutting-edge AI-powered platform designed to transform AI-generated text into natural, 
                    human-like writing. Our sophisticated algorithms analyze your content and intelligently rewrite it to sound 
                    more authentic, engaging, and relatable to your target audience.
                  </p>
                  <p>
                    Whether you need a casual tone for social media engagement, a professional voice for business 
                    communications, creative flair for marketing campaigns, or a natural balanced approach for general content, 
                    Humality seamlessly adapts to your specific requirements.
                  </p>
                  <p>
                    Our mission is to bridge the gap between artificial intelligence and authentic human expression, 
                    making AI-generated content feel genuine, trustworthy, and emotionally resonant. We believe that 
                    technology should enhance human communication, not replace it.
                  </p>
                  <div className="pt-6 mt-6 border-t border-brand-200">
                    <h3 className="text-gray-900 mb-4">Why Choose Humality?</h3>
                    <ul className="space-y-3">
                      {[
                        'Advanced AI algorithms for natural text transformation',
                        'Multiple tone options to match your brand voice',
                        'Instant results with high-quality output',
                        'Easy-to-use interface designed for everyone',
                        'Continuous improvements based on user feedback'
                      ].map((item, index) => (
                        <motion.li
                          key={index}
                          className="flex items-start gap-3"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + index * 0.1 }}
                        >
                          <Check className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
                          <span>{item}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                </motion.div>
              </Card>
            </motion.div>
          )}

          {activeSection === 'contact' && (
            <motion.div
              key="contact"
              className="max-w-4xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="glass-panel p-8 sm:p-12 bg-white/70 backdrop-blur-md border-brand-200/50 shadow-2xl">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="w-16 h-16 bg-gradient-to-br from-brand-500 to-brand-600 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-brand-500/30">
                    <Mail className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-gray-900 mb-6">Get in Touch</h2>
                </motion.div>
                <motion.div
                  className="space-y-6 text-gray-600"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <p>
                    We'd love to hear from you! Whether you have questions, feedback, suggestions for improvement, 
                    or just want to say hello, feel free to reach out to our team.
                  </p>
                  
                  <div className="grid sm:grid-cols-2 gap-6 pt-4">
                    <motion.div
                      className="p-6 bg-gradient-to-br from-brand-50 to-brand-100 rounded-2xl border border-brand-200/50"
                      whileHover={{ scale: 1.02 }}
                    >
                      <Mail className="w-6 h-6 text-brand-600 mb-3" />
                      <h3 className="text-gray-900 mb-2">General Inquiries</h3>
                      <a href="mailto:hello@humality.ai" className="text-brand-600 hover:text-brand-700 transition-colors">
                        hello@humality.ai
                      </a>
                    </motion.div>
                    
                    <motion.div
                      className="p-6 bg-gradient-to-br from-brand-100 to-brand-200 rounded-2xl border border-brand-200/50"
                      whileHover={{ scale: 1.02 }}
                    >
                      <Shield className="w-6 h-6 text-brand-600 mb-3" />
                      <h3 className="text-gray-900 mb-2">Support</h3>
                      <a href="mailto:support@humality.ai" className="text-brand-600 hover:text-brand-700 transition-colors">
                        support@humality.ai
                      </a>
                    </motion.div>
                  </div>
                  
                  <div className="pt-6 mt-6 border-t border-brand-200">
                    <p className="flex items-start gap-3">
                      <MessageSquare className="w-5 h-5 text-brand-600 mt-0.5 flex-shrink-0" />
                      <span>
                        Your feedback is invaluable to us. It helps us continuously improve Humality and 
                        provide better results for everyone in our community.
                      </span>
                    </p>
                  </div>
                </motion.div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="mt-20 py-8 bg-white/50 backdrop-blur-md border-t border-brand-200/50 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Humality Logo" className="w-8 h-8" />
              <span className="text-gray-600">© 2025 Humality. All rights reserved.</span>
            </div>
            <div className="flex gap-6 text-gray-600">
              <button onClick={() => setActiveSection('about')} className="hover:text-brand-600 transition-colors">
                About
              </button>
              <button onClick={() => setActiveSection('contact')} className="hover:text-brand-600 transition-colors">
                Contact
              </button>
            </div>
          </div>
        </div>
      </footer>

      <ThemeFab />

      {/* History Panel */}
      <AnimatePresence>
        {showHistory && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
              onClick={() => setShowHistory(false)}
            />
            
            {/* Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed right-0 top-0 h-full w-full sm:w-[480px] bg-white shadow-2xl z-[70] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-brand-500 to-brand-600 text-white">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <History className="w-6 h-6" />
                    <h2 className="text-white">Conversion History</h2>
                  </div>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-brand-100" style={{ fontSize: '0.875rem' }}>
                  {history.length} conversion{history.length !== 1 ? 's' : ''} saved
                </p>
              </div>

              {/* History List */}
              <div className="flex-1 overflow-y-auto p-4">
                {isHistoryLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <RefreshCw className="w-10 h-10 text-brand-500 mb-4 animate-spin" />
                    <h3 className="text-gray-900 mb-2">Fetching your history...</h3>
                    <p className="text-gray-500">
                      Please wait a moment while we load your latest conversions.
                    </p>
                  </div>
                ) : history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center px-6">
                    <History className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-gray-900 mb-2">No History Yet</h3>
                    <p className="text-gray-500">
                      Your conversion history will appear here. Start humanizing text to build your history!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((entry, index) => (
                      <motion.div
                        key={entry.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200 hover:shadow-lg transition-shadow"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-gray-500" />
                            <span className="text-gray-600" style={{ fontSize: '0.75rem' }}>
                              {formatTimeAgo(entry.timestamp)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-brand-100 text-brand-700 border-0">
                              {entry.tone}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="space-y-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600" style={{ fontSize: '0.75rem' }}>Original:</span>
                            <Badge className={`${
                              entry.inputAIPercentage >= 70 ? 'bg-red-500' :
                              entry.inputAIPercentage >= 40 ? 'bg-orange-500' :
                              entry.inputAIPercentage >= 20 ? 'bg-yellow-500' :
                              'bg-green-500'
                            } text-white border-0`} style={{ fontSize: '0.7rem' }}>
                              {entry.inputAIPercentage}% AI
                            </Badge>
                          </div>
                          <p className="text-gray-700 line-clamp-2" style={{ fontSize: '0.875rem' }}>
                            {entry.inputText}
                          </p>
                        </div>
                        
                        <div className="space-y-2 mb-4 pb-4 border-b border-gray-300">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-600" style={{ fontSize: '0.75rem' }}>Humanized:</span>
                            <Badge className={`${
                              entry.outputAIPercentage >= 70 ? 'bg-red-500' :
                              entry.outputAIPercentage >= 40 ? 'bg-orange-500' :
                              entry.outputAIPercentage >= 20 ? 'bg-yellow-500' :
                              'bg-green-500'
                            } text-white border-0`} style={{ fontSize: '0.7rem' }}>
                              {entry.outputAIPercentage}% AI
                            </Badge>
                          </div>
                          <p className="text-gray-700 line-clamp-2" style={{ fontSize: '0.875rem' }}>
                            {entry.outputText}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <motion.button
                            onClick={() => restoreFromHistory(entry)}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span style={{ fontSize: '0.875rem' }}>Restore</span>
                          </motion.button>
                          <motion.button
                            onClick={() => deleteHistoryEntry(entry.id)}
                            className="p-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              {history.length > 0 && (
                <div className="p-4 border-t border-gray-200 bg-gray-50">
                  <motion.button
                    onClick={clearAllHistory}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-100 hover:bg-red-200 text-red-600 rounded-xl transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear All History</span>
                  </motion.button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Auth Modals */}
      <AuthModals
        showLoginModal={showLoginModal}
        setShowLoginModal={setShowLoginModal}
        showSignupModal={showSignupModal}
        setShowSignupModal={setShowSignupModal}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        loginPassword={loginPassword}
        setLoginPassword={setLoginPassword}
        signupName={signupName}
        setSignupName={setSignupName}
        signupEmail={signupEmail}
        setSignupEmail={setSignupEmail}
        signupPassword={signupPassword}
        setSignupPassword={setSignupPassword}
        handleLogin={handleLogin}
        handleSignup={handleSignup}
        onGoogleLogin={() => handleGoogleAuth('login')}
        onGoogleSignup={() => handleGoogleAuth('signup')}
        isGoogleLoading={isGoogleLoading}
        isLoginLoading={isLoginLoading}
        isSignupLoading={isSignupLoading}
      />
    </div>
  );
}
