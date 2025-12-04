import { useState, useEffect, useRef } from 'react';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Sparkles, Star, Copy, Check, ArrowRight, Zap, Shield, RefreshCw, Mail, MessageSquare, User, AlertCircle, History, Clock, Trash2, RotateCcw, LogOut, UserCircle, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';
import { Input } from './components/ui/input';
import { Label } from './components/ui/label';
import { AuthModals } from './components/AuthModals';
import logo from 'figma:asset/2d046533a292fce0e8c6f0953a21393852b873e7.png';
import { FirebaseError } from 'firebase/app';
import { signInWithPopup, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updateProfile, signInWithRedirect, getRedirectResult } from 'firebase/auth';
import type { User as FirebaseAuthUser } from 'firebase/auth';
import { auth, googleProvider } from './firebase/config';
import { fetchHistoryEntries, saveHistoryEntry, deleteHistoryEntryFromFirestore, HistoryEntryDocument } from './services/history';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// AI Detection types
interface TextSegment {
  text: string;
  aiProbability: number; // 0-1
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

// Mock AI Detection Algorithm
const analyzeAIContent = (text: string, isHumanized: boolean = false): { segments: TextSegment[], overallPercentage: number } => {
  if (!text.trim()) {
    return { segments: [], overallPercentage: 0 };
  }

  // Split text into sentences
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  const segments: TextSegment[] = sentences.map((sentence, index) => {
    // Mock AI detection based on various "signals"
    let aiScore = 0;
    
    // Check for common AI patterns
    const aiIndicators = [
      /furthermore|moreover|additionally|consequently/i,
      /it is important to note|it should be noted/i,
      /in conclusion|to summarize/i,
      /various|numerous|multitude/i,
      /optimize|leverage|utilize|facilitate/i,
    ];
    
    const humanIndicators = [
      /I think|I feel|I believe/i,
      /honestly|basically|literally/i,
      /stuff|things|kinda|sorta/i,
    ];
    
    // Score based on indicators
    aiIndicators.forEach(pattern => {
      if (pattern.test(sentence)) aiScore += 0.2;
    });
    
    humanIndicators.forEach(pattern => {
      if (pattern.test(sentence)) aiScore -= 0.15;
    });
    
    // Sentence length (AI tends to use medium-length sentences)
    const wordCount = sentence.trim().split(/\s+/).length;
    if (wordCount > 15 && wordCount < 30) aiScore += 0.15;
    
    // Add some randomness but bias based on isHumanized
    const randomFactor = Math.random() * 0.3;
    aiScore += isHumanized ? randomFactor - 0.4 : randomFactor + 0.3;
    
    // Normalize to 0-1 range
    aiScore = Math.max(0, Math.min(1, aiScore));
    
    return {
      text: sentence,
      aiProbability: isHumanized ? aiScore * 0.3 : aiScore * 0.95, // Humanized text has much lower AI scores
    };
  });
  
  // Calculate overall percentage
  const overallPercentage = segments.reduce((sum, seg) => sum + seg.aiProbability, 0) / segments.length;
  
  return {
    segments,
    overallPercentage: Math.round(overallPercentage * 100),
  };
};

// Get color for AI probability
const getAIHighlightColor = (probability: number): string => {
  if (probability >= 0.7) return 'bg-red-200/60'; // High AI
  if (probability >= 0.4) return 'bg-orange-200/60'; // Medium AI
  if (probability >= 0.2) return 'bg-yellow-200/60'; // Low-Medium AI
  return 'bg-green-200/40'; // Likely Human
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
];

const features = [
  { icon: Zap, title: 'Instant Results', description: 'Get humanized text in seconds' },
  { icon: Shield, title: 'Natural Flow', description: 'Authentic, engaging content' },
  { icon: RefreshCw, title: 'Multiple Styles', description: 'Adapt to any tone you need' },
];

const GOOGLE_AUTH_MODE_KEY = 'humality_google_mode';

const mapHistoryDocumentToEntry = (doc: HistoryEntryDocument): HistoryEntry => {
  const inputAnalysis = analyzeAIContent(doc.inputText, false);
  const outputAnalysis = analyzeAIContent(doc.outputText, true);
  return {
    id: doc.id,
    inputText: doc.inputText,
    outputText: doc.outputText,
    tone: doc.tone,
    inputAIPercentage: inputAnalysis.overallPercentage,
    outputAIPercentage: outputAnalysis.overallPercentage,
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
  const [inputAIAnalysis, setInputAIAnalysis] = useState<{ segments: TextSegment[], overallPercentage: number }>({ segments: [], overallPercentage: 0 });
  const [outputAIAnalysis, setOutputAIAnalysis] = useState<{ segments: TextSegment[], overallPercentage: number }>({ segments: [], overallPercentage: 0 });
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

  useEffect(() => {
    let isMounted = true;

    const fetchTones = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/tones`);
        if (!response.ok) {
          throw new Error('Failed to fetch tone presets');
        }
        const data = await response.json();
        if (Array.isArray(data) && data.length) {
          const mappedTones: ToneOption[] = data.map((preset: { key: string; label: string; description: string }) => ({
            value: preset.key,
            label: preset.label,
            description: preset.description,
            icon: toneIconMap[preset.key] || Sparkles,
          }));
          if (isMounted) {
            setToneOptions(mappedTones);
            setTone((prev) => (mappedTones.some(option => option.value === prev) ? prev : mappedTones[0]?.value || prev));
          }
        }
      } catch (error) {
        console.error('Unable to load tone presets', error);
      }
    };

    fetchTones();

    return () => {
      isMounted = false;
    };
  }, []);

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const mapped = mapFirebaseUser(firebaseUser);
      setUser(mapped);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleRedirectResult = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          const mapped = mapFirebaseUser(result.user);
          if (mapped) {
            setUser(mapped);
          }
          const mode = window.localStorage.getItem(GOOGLE_AUTH_MODE_KEY) as 'login' | 'signup' | null;
          if (mode) {
            toast.success(mode === 'login' ? 'Logged in with Google!' : 'Signed up with Google!');
            window.localStorage.removeItem(GOOGLE_AUTH_MODE_KEY);
          } else {
            toast.success('Signed in with Google!');
          }
          setShowLoginModal(false);
          setShowSignupModal(false);
        }
      } catch (error) {
        console.error('Google redirect failed', error);
        toast.error(getAuthErrorMessage(error));
      }
    };

    handleRedirectResult();
  }, []);

  useEffect(() => {
    if (!user?.uid) {
      setHistory([]);
      setShowHistory(false);
       setIsHistoryLoading(false);
      return;
    }

    let isActive = true;
    setIsHistoryLoading(true);

    const loadHistory = async () => {
      try {
        const entries = await fetchHistoryEntries(user.uid);
        if (!isActive) return;
        const mapped = entries.map(mapHistoryDocumentToEntry);
        setHistory(mapped);
      } catch (error) {
        console.error('Failed to load history', error);
        toast.error('Unable to load your history right now.');
      } finally {
        if (isActive) {
          setIsHistoryLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      isActive = false;
    };
  }, [user?.uid]);

  // Analyze input text when it changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setInputText(text);
    const analysis = analyzeAIContent(text, false);
    setInputAIAnalysis(analysis);
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
    setOutputAIAnalysis({ segments: [], overallPercentage: 0 });
    
    try {
      const response = await fetch(`${API_BASE_URL}/humanize`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: inputText, tone }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.detail || 'Failed to humanize text. Please try again.');
      }

      const humanizedResponse = data?.humanized_text;
      const humanized = typeof humanizedResponse === 'string' ? humanizedResponse.trim() : '';

      if (!humanized) {
        throw new Error('Received empty response from the humanization service.');
      }
      
      setShouldAnimateOutput(true);
      setOutputText(humanized);
      
      // Analyze humanized output
      const analysis = analyzeAIContent(humanized, true);
      setOutputAIAnalysis(analysis);
      
      // Add to history (persist if signed in)
      let historyEntryId: string | null = null;
      if (user?.uid) {
        try {
          historyEntryId = await saveHistoryEntry({
            uid: user.uid,
            inputText,
            outputText: humanized,
            tone,
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
          inputAIPercentage: inputAIAnalysis.overallPercentage,
          outputAIPercentage: analysis.overallPercentage,
          timestamp: Date.now(),
        };
        setHistory((prev) => [newEntry, ...prev]);
      }
      
      toast.success('Text humanized successfully!');
      if (!user) {
        toast.info('Sign in to save your conversions to history.');
      }
    } catch (error) {
      console.error('Humanization failed', error);
      toast.error(error instanceof Error ? error.message : 'Something went wrong while humanizing your text.');
    } finally {
      setIsConverting(false);
    }
  };

  const handleRating = (value: number) => {
    setRating(value);
    toast.success(`Thanks for rating ${value} star${value > 1 ? 's' : ''}!`);
  };

  const handleCopy = async () => {
    if (!outputText) return;
    
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      toast.success('Copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy text');
    }
  };

  const restoreFromHistory = (entry: HistoryEntry) => {
    setInputText(entry.inputText);
    setOutputText(entry.outputText);
    setDisplayedOutput(entry.outputText);
    setShouldAnimateOutput(false);
    setIsAnimatingOutput(false);
    setTone(entry.tone);
    setInputAIAnalysis(analyzeAIContent(entry.inputText, false));
    setOutputAIAnalysis(analyzeAIContent(entry.outputText, true));
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

  const inputCharCount = inputText.length;
  const outputCharCount = outputText.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-brand-50 to-brand-100 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-40 -right-40 w-80 h-80 bg-brand-300 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-400 rounded-full mix-blend-multiply filter blur-xl opacity-20"
          animate={{
            x: [0, -100, 0],
            y: [0, -50, 0],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <Toaster position="top-center" />

      {/* Header */}
      <header className="bg-white/70 backdrop-blur-md border-b border-brand-200/50 sticky top-0 z-50 shadow-sm">
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
                <span className="text-gray-900 block leading-tight">Humality</span>
                <span className="text-brand-600 block leading-tight" style={{ fontSize: '0.7rem' }}>AI Text Humanizer</span>
              </div>
            </motion.div>
            <div className="flex items-center gap-3">
              <nav className="flex gap-1 sm:gap-2 items-center">
                {activeSection === 'home' && user && (
                  <motion.button
                    onClick={toggleHistoryPanel}
                    className={`px-3 py-2 rounded-lg transition-all flex items-center gap-2 ${
                      showHistory
                        ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
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
                        ? 'bg-gradient-to-r from-brand-500 to-brand-600 text-white shadow-lg shadow-brand-500/30'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
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
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <Badge className="mb-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white border-0 px-4 py-1.5">
                    AI-Powered Text Transformation
                  </Badge>
                  <h1 className="text-gray-900 mb-4 bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700 bg-clip-text text-transparent">
                    Making AI Text Feel Human
                  </h1>
                  <p className="text-gray-600 max-w-2xl mx-auto mb-8">
                    Transform your AI-generated content into natural, engaging text that resonates with your audience. 
                    Choose your tone, click convert, and watch the magic happen.
                  </p>
                </motion.div>
              </div>

              {/* Tone Selection */}
              <motion.div
                className="mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <label className="text-gray-800 mb-4 block text-center">Select Your Tone</label>
                <div className="flex flex-wrap justify-center gap-3 sm:gap-4 max-w-5xl mx-auto">
                  {toneOptions.map((option) => (
                    <motion.button
                      key={option.value}
                      onClick={() => setTone(option.value)}
                      className={`p-4 sm:p-5 rounded-2xl border-2 transition-all min-w-[170px] sm:min-w-[200px] ${
                        tone === option.value
                          ? 'bg-gradient-to-br from-brand-500 to-brand-600 border-brand-600 text-white shadow-lg shadow-brand-500/40'
                          : 'bg-white/60 backdrop-blur-sm border-brand-200/50 text-gray-700'
                      }`}
                      whileHover={{ 
                        y: -10,
                        boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)"
                      }}
                      whileTap={{ scale: 0.97 }}
                      transition={{ 
                        duration: 0.2,
                        ease: "easeOut"
                      }}
                    >
                      <option.icon className={`w-6 h-6 mx-auto mb-2 ${tone === option.value ? 'text-white' : 'text-brand-600'}`} />
                      <div className={tone === option.value ? 'text-white' : 'text-gray-900'}>{option.label}</div>
                      <div className={`mt-1 ${tone === option.value ? 'text-brand-100' : 'text-gray-500'}`} style={{ fontSize: '0.8rem' }}>
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
                <Card className="p-6 bg-white/70 backdrop-blur-md border-brand-200/50 shadow-xl hover:shadow-2xl transition-shadow">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <label className="text-gray-800">AI-Generated Text</label>
                      {inputAIAnalysis.overallPercentage > 0 && (
                        <Badge 
                          className={`${
                            inputAIAnalysis.overallPercentage >= 70 ? 'bg-red-500' :
                            inputAIAnalysis.overallPercentage >= 40 ? 'bg-orange-500' :
                            inputAIAnalysis.overallPercentage >= 20 ? 'bg-yellow-500' :
                            'bg-green-500'
                          } text-white border-0`}
                        >
                          {inputAIAnalysis.overallPercentage}% AI
                        </Badge>
                      )}
                    </div>
                    <span className="text-gray-500" style={{ fontSize: '0.875rem' }}>
                      {inputCharCount} characters
                    </span>
                  </div>
                  <Textarea
                    value={inputText}
                    onChange={handleInputChange}
                    placeholder="Paste or type your AI-generated text here... Start typing to see AI detection analysis."
                    className="min-h-[280px] resize-none bg-white/80 border-brand-300/50 focus:border-brand-500 focus:ring-brand-500/20 rounded-xl"
                  />
                  
                  {/* AI Detection Highlight View */}
                  {inputAIAnalysis.segments.length > 0 && (
                    <motion.div 
                      className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 max-h-[200px] overflow-y-auto"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-brand-600" />
                        <span className="text-gray-700" style={{ fontSize: '0.875rem' }}>AI Detection Analysis</span>
                      </div>
                      <div className="space-y-1">
                        {inputAIAnalysis.segments.map((segment, index) => (
                          <span
                            key={index}
                            className={`inline ${getAIHighlightColor(segment.aiProbability)} px-1 py-0.5 rounded transition-colors`}
                            title={`${Math.round(segment.aiProbability * 100)}% AI probability`}
                          >
                            {segment.text}
                          </span>
                        ))}
                      </div>
                      {/* Color Legend */}
                      <div className="mt-3 pt-3 border-t border-gray-300 flex flex-wrap gap-3" style={{ fontSize: '0.75rem' }}>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-red-200/60 rounded"></div>
                          <span className="text-gray-600">High AI (70%+)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-orange-200/60 rounded"></div>
                          <span className="text-gray-600">Medium AI (40-70%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-yellow-200/60 rounded"></div>
                          <span className="text-gray-600">Low AI (20-40%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-200/40 rounded"></div>
                          <span className="text-gray-600">Human-like (&lt;20%)</span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </Card>

                {/* Output Section */}
                <Card className="p-6 bg-white/70 backdrop-blur-md border-brand-200/50 shadow-xl hover:shadow-2xl transition-shadow relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <label className="text-gray-800">Humanized Text</label>
                      {outputText && (
                        <Badge className="bg-green-500 text-white border-0">
                          {outputAIAnalysis.overallPercentage}% AI
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500" style={{ fontSize: '0.875rem' }}>
                        {outputCharCount} characters
                      </span>
                      {outputText && (
                        <motion.button
                          onClick={handleCopy}
                          className="p-2 rounded-lg bg-brand-100 hover:bg-brand-200 text-brand-700 transition-colors"
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </motion.button>
                      )}
                    </div>
                  </div>
                  <Textarea
                    value={displayedOutput}
                    readOnly
                    placeholder="Your humanized text will appear here... Click the convert button below to get started."
                    className={`min-h-[280px] resize-none bg-white/80 border-brand-300/50 rounded-xl transition-all ${isAnimatingOutput ? 'ring-2 ring-brand-200 shadow-lg shadow-brand-200/40' : ''}`}
                  />
                  
                  {/* AI Detection Highlight View */}
                  {outputAIAnalysis.segments.length > 0 && (
                    <motion.div 
                      className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200 max-h-[200px] overflow-y-auto"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <AlertCircle className="w-4 h-4 text-green-600" />
                        <span className="text-gray-700" style={{ fontSize: '0.875rem' }}>AI Detection Analysis</span>
                      </div>
                      <div className="space-y-1">
                        {outputAIAnalysis.segments.map((segment, index) => (
                          <span
                            key={index}
                            className={`inline ${getAIHighlightColor(segment.aiProbability)} px-1 py-0.5 rounded transition-colors`}
                            title={`${Math.round(segment.aiProbability * 100)}% AI probability`}
                          >
                            {segment.text}
                          </span>
                        ))}
                      </div>
                      {/* Color Legend */}
                      <div className="mt-3 pt-3 border-t border-gray-300 flex flex-wrap gap-3" style={{ fontSize: '0.75rem' }}>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-red-200/60 rounded"></div>
                          <span className="text-gray-600">High AI (70%+)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-orange-200/60 rounded"></div>
                          <span className="text-gray-600">Medium AI (40-70%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-yellow-200/60 rounded"></div>
                          <span className="text-gray-600">Low AI (20-40%)</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className="w-3 h-3 bg-green-200/40 rounded"></div>
                          <span className="text-gray-600">Human-like (&lt;20%)</span>
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
                        className="pt-6 mt-6 border-t border-brand-200"
                      >
                        <label className="text-gray-800 mb-3 block">How did we do?</label>
                        <div className="flex gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <motion.button
                              key={star}
                              onClick={() => handleRating(star)}
                              onMouseEnter={() => setHoverRating(star)}
                              onMouseLeave={() => setHoverRating(0)}
                              whileHover={{ scale: 1.2, rotate: [0, -10, 10, 0] }}
                              whileTap={{ scale: 0.9 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Star
                                className={`w-9 h-9 transition-all ${
                                  star <= (hoverRating || rating)
                                    ? 'fill-yellow-400 text-yellow-400 drop-shadow-lg'
                                    : 'text-gray-300'
                                }`}
                              />
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>

              {/* Convert Button */}
              <motion.div
                className="flex justify-center mb-16"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                  <Button
                    onClick={handleConvert}
                    disabled={!inputText.trim() || isConverting}
                    className="bg-gradient-to-r from-brand-500 via-brand-600 to-brand-700 hover:from-brand-600 hover:via-brand-700 hover:to-brand-700 text-white px-16 py-7 rounded-2xl shadow-2xl shadow-brand-500/40 hover:shadow-brand-600/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                    {isConverting ? (
                      <span className="flex items-center gap-3">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <RefreshCw className="w-6 h-6" />
                        </motion.div>
                        Converting...
                      </span>
                    ) : (
                      <span className="flex items-center gap-3">
                        <Sparkles className="w-6 h-6" />
                        Humanize Text
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </span>
                    )}
                  </Button>
                </motion.div>
              </motion.div>

              {/* Features Grid - Moved to bottom */}
              <motion.div
                className="grid sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                {features.map((feature, index) => (
                  <motion.div
                    key={feature.title}
                    className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-brand-200/50 shadow-lg"
                    whileHover={{ 
                      y: -10,
                      boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)"
                    }}
                    transition={{ 
                      duration: 0.2,
                      ease: "easeOut"
                    }}
                  >
                    <feature.icon className="w-8 h-8 text-brand-600 mx-auto mb-3" />
                    <h3 className="text-gray-900 mb-2">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
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
              <Card className="p-8 sm:p-12 bg-white/70 backdrop-blur-md border-brand-200/50 shadow-2xl">
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
              <Card className="p-8 sm:p-12 bg-white/70 backdrop-blur-md border-brand-200/50 shadow-2xl">
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
