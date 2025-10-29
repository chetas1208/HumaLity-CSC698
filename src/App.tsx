import { useState } from 'react';
import { Button } from './components/ui/button';
import { Textarea } from './components/ui/textarea';
import { Card } from './components/ui/card';
import { Badge } from './components/ui/badge';
import { Sparkles, Star, Copy, Check, ArrowRight, Zap, Shield, RefreshCw, Mail, MessageSquare, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner@2.0.3';
import { Toaster } from './components/ui/sonner';
import logo from 'figma:asset/2d046533a292fce0e8c6f0953a21393852b873e7.png';

const toneOptions = [
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

export default function App() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [tone, setTone] = useState('natural');
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [isConverting, setIsConverting] = useState(false);
  const [activeSection, setActiveSection] = useState('home');
  const [copied, setCopied] = useState(false);

  const handleConvert = async () => {
    if (!inputText.trim()) {
      toast.error('Please enter some text to humanize');
      return;
    }
    
    setIsConverting(true);
    setRating(0);
    setOutputText('');
    
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock humanization based on tone
    const selectedTone = toneOptions.find(t => t.value === tone);
    let humanized = inputText;
    
    if (tone === 'casual') {
      humanized = `${inputText}\n\n✨ Transformed with a casual, friendly vibe that feels natural and approachable.`;
    } else if (tone === 'professional') {
      humanized = `${inputText}\n\n✨ Refined with professional polish while maintaining clarity and authenticity.`;
    } else if (tone === 'creative') {
      humanized = `${inputText}\n\n✨ Enhanced with creative flair and expressive language that captivates.`;
    } else {
      humanized = `${inputText}\n\n✨ Optimized for natural, human-like flow that resonates authentically.`;
    }
    
    setOutputText(humanized);
    setIsConverting(false);
    toast.success('Text humanized successfully!');
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
            <nav className="flex gap-1 sm:gap-2">
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
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 max-w-5xl mx-auto">
                  {toneOptions.map((option) => (
                    <motion.button
                      key={option.value}
                      onClick={() => setTone(option.value)}
                      className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
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
                    <label className="text-gray-800">AI-Generated Text</label>
                    <span className="text-gray-500" style={{ fontSize: '0.875rem' }}>
                      {inputCharCount} characters
                    </span>
                  </div>
                  <Textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Paste or type your AI-generated text here... Start typing to see the character count update."
                    className="min-h-[320px] resize-none bg-white/80 border-brand-300/50 focus:border-brand-500 focus:ring-brand-500/20 rounded-xl"
                  />
                </Card>

                {/* Output Section */}
                <Card className="p-6 bg-white/70 backdrop-blur-md border-brand-200/50 shadow-xl hover:shadow-2xl transition-shadow relative">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-gray-800">Humanized Text</label>
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
                    value={outputText}
                    readOnly
                    placeholder="Your humanized text will appear here... Click the convert button below to get started."
                    className="min-h-[320px] resize-none bg-white/80 border-brand-300/50 rounded-xl"
                  />
                  
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
    </div>
  );
}
