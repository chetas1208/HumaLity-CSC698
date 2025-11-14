import { motion, AnimatePresence } from 'motion/react';
import { X } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import logo from 'figma:asset/2d046533a292fce0e8c6f0953a21393852b873e7.png';

interface AuthModalsProps {
  showLoginModal: boolean;
  showSignupModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  setShowSignupModal: (show: boolean) => void;
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginPassword: string;
  setLoginPassword: (password: string) => void;
  signupName: string;
  setSignupName: (name: string) => void;
  signupEmail: string;
  setSignupEmail: (email: string) => void;
  signupPassword: string;
  setSignupPassword: (password: string) => void;
  handleLogin: (e: React.FormEvent) => void;
  handleSignup: (e: React.FormEvent) => void;
  onGoogleLogin: () => void;
  onGoogleSignup: () => void;
  isGoogleLoading: boolean;
  isLoginLoading: boolean;
  isSignupLoading: boolean;
}

export function AuthModals({
  showLoginModal,
  showSignupModal,
  setShowLoginModal,
  setShowSignupModal,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  signupName,
  setSignupName,
  signupEmail,
  setSignupEmail,
  signupPassword,
  setSignupPassword,
  handleLogin,
  handleSignup,
  onGoogleLogin,
  onGoogleSignup,
  isGoogleLoading,
  isLoginLoading,
  isSignupLoading,
}: AuthModalsProps) {
  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.2045c0-.6385-.0573-1.2515-.1636-1.8405H9v3.4815h4.8445a4.143 4.143 0 0 1-1.8 2.718v2.2585h2.908c1.7025-1.566 2.6875-3.874 2.6875-6.6175z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.4675-.8055 5.956-2.176l-2.908-2.2585c-.8055.54-1.8375.861-3.048.861-2.344 0-4.33-1.584-5.0365-3.7105H.9575v2.332c1.48 2.94 4.52 4.952 8.0425 4.952z" fill="#34A853"/>
      <path d="M3.9635 10.716a5.395 5.395 0 0 1-.2815-1.716c0-.595.1025-1.172.2815-1.716V4.952H.9575A8.98 8.98 0 0 0 0 9c0 1.456.3485 2.83.9575 4.048l3.006-2.332z" fill="#FBBC05"/>
      <path d="M9 3.5795c1.3225 0 2.5075.454 3.4395 1.346l2.58-2.58C13.4645.889 11.427.001 9 .001 5.4775.001 2.4375 2.013 0 4.952l3.006 2.3325C4.67 5.1635 6.656 3.5795 9 3.5795z" fill="#EA4335"/>
    </svg>
  );

  return (
    <>
      {/* Login Modal */}
      <AnimatePresence>
        {showLoginModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]"
              onClick={() => setShowLoginModal(false)}
            />
            <div className="fixed inset-0 flex items-center justify-center z-[90] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Card className="w-full max-w-md p-8 bg-white/95 backdrop-blur-md border-brand-200/50 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <img src={logo} alt="Humality Logo" className="w-10 h-10" />
                      <h2 className="text-gray-900">Welcome Back</h2>
                    </div>
                    <button
                      onClick={() => setShowLoginModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <p className="text-gray-600 mb-6">
                    Login to access your history and personalized features
                  </p>

                  <div className="mb-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onGoogleLogin}
                      disabled={isGoogleLoading}
                      className="w-full justify-center rounded-full h-14 border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 gap-3 shadow-sm disabled:opacity-70"
                    >
                      <GoogleIcon />
                      {isGoogleLoading ? 'Connecting...' : 'Continue with Google'}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 mt-0 mb-0">
                    <span className="flex-1 h-px bg-gray-200" />
                    <span className="text-gray-500 text-xs uppercase tracking-widest">Or continue with email</span>
                    <span className="flex-1 h-px bg-gray-200" />
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="your@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="mt-2.5 mb-2.5 h-14 rounded-full border border-gray-300 bg-gray-50 px-6 text-base text-gray-700 placeholder:text-gray-500"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="mt-2.5 h-14 rounded-full border border-gray-300 bg-gray-50 px-6 text-base text-gray-700 placeholder:text-gray-500"
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={isLoginLoading}
                      className="w-full h-14 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white rounded-full text-base font-semibold shadow-lg shadow-brand-500/40 disabled:opacity-70"
                    >
                      {isLoginLoading ? 'Logging in…' : 'Login'}
                    </Button>
                  </form>

                  <div className="mt-6 text-center">
                    <p className="text-gray-600">
                      Don't have an account?{' '}
                      <button
                        onClick={() => {
                          setShowLoginModal(false);
                          setShowSignupModal(true);
                        }}
                        className="text-brand-600 hover:text-brand-700 transition-colors"
                      >
                        Sign up
                      </button>
                    </p>
                  </div>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* Signup Modal */}
      <AnimatePresence>
        {showSignupModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80]"
              onClick={() => setShowSignupModal(false)}
            />
            <div className="fixed inset-0 flex items-center justify-center z-[90] p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                <Card className="w-full max-w-md p-8 bg-white/95 backdrop-blur-md border-brand-200/50 shadow-2xl">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <img src={logo} alt="Humality Logo" className="w-10 h-10" />
                      <h2 className="text-gray-900">Create Account</h2>
                    </div>
                    <button
                      onClick={() => setShowSignupModal(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-gray-500" />
                    </button>
                  </div>

                  <p className="text-gray-600 mb-6">
                    Join Humality to save your history and unlock more features
                  </p>

                  <div className="mb-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onGoogleSignup}
                      disabled={isGoogleLoading}
                      className="w-full justify-center rounded-full h-14 border border-gray-200 bg-white text-gray-900 font-semibold hover:bg-gray-50 gap-3 shadow-sm disabled:opacity-70"
                    >
                      <GoogleIcon />
                      {isGoogleLoading ? 'Connecting...' : 'Sign up with Google'}
                    </Button>
                  </div>

                  <div className="flex items-center gap-2 mt-0 mb-0">
                    <span className="flex-1 h-px bg-gray-200" />
                    <span className="text-gray-500 text-xs uppercase tracking-widest">Or continue with email</span>
                    <span className="flex-1 h-px bg-gray-200" />
                  </div>

                  <form onSubmit={handleSignup} className="space-y-4">
                    <div>
                      <Label htmlFor="signup-name">Name</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="John Doe"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="mt-2.5 h-14 rounded-full border border-gray-300 bg-gray-50 px-6 text-base text-gray-700 placeholder:text-gray-500"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="your@email.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        className="mt-2.5 mb-2.5 h-14 rounded-full border border-gray-300 bg-gray-50 px-6 text-base text-gray-700 placeholder:text-gray-500"
                        required
                      />
                    </div>

                    <div>
                      <Label htmlFor="signup-password">Password</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="••••••••"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="mt-2.5 h-14 rounded-full border border-gray-300 bg-gray-50 px-6 text-base text-gray-700 placeholder:text-gray-500"
                        required
                        minLength={6}
                      />
                      <p className="text-gray-500 mt-1" style={{ fontSize: '0.75rem' }}>
                        At least 6 characters
                      </p>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSignupLoading}
                      className="w-full h-14 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white rounded-full text-base font-semibold shadow-lg shadow-brand-500/40 disabled:opacity-70"
                    >
                      {isSignupLoading ? 'Creating account…' : 'Create Account'}
                    </Button>
                  </form>

                  <div className="mt-6 text-center">
                    <p className="text-gray-600">
                      Already have an account?{' '}
                      <button
                        onClick={() => {
                          setShowSignupModal(false);
                          setShowLoginModal(true);
                        }}
                        className="text-brand-600 hover:text-brand-700 transition-colors"
                      >
                        Login
                      </button>
                    </p>
                  </div>
                </Card>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
