import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, User, FileText, AlertCircle, HelpCircle, Send, Loader2, Mic, StopCircle, Volume2 } from 'lucide-react';
import './index.css';

// Role configuration with avatars and colors
const ROLES = {
  Director: { icon: '👔', color: 'bg-purple-100 text-purple-800', name: 'Director' },
  HR: { icon: '👥', color: 'bg-blue-100 text-blue-800', name: 'HR Officer' },
  Procurement: { icon: '📋', color: 'bg-green-100 text-green-800', name: 'Procurement Officer' },
  Engineer: { icon: '🔧', color: 'bg-orange-100 text-orange-800', name: 'Engineer' },
  StationController: { icon: '🚇', color: 'bg-teal-100 text-teal-800', name: 'Station Controller' }
};

interface Message {
  id: string;
  from: 'user' | 'ai';
  text: string;
  sources?: Array<{ source: string; page: number }>;
  timestamp: Date;
}

interface LastResult {
  retrieved: any[];
  question: string;
}

const INITIAL_MESSAGE: Message = {
  id: '1',
  from: 'ai',
  text: 'Hello! I\'m Saarthi, your KMRL document assistant. I can help you find information based on your role. Ask me anything about policies, procedures, maintenance, or operations.',
  timestamp: new Date()
};

// Speech Recognition setup (typed for browsers)
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;
if (recognition) {
  recognition.continuous = true;
  recognition.interimResults = true;
}

function App() {
  const [selectedRole, setSelectedRole] = useState<keyof typeof ROLES>('Director');
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [showBriefings, setShowBriefings] = useState(false);
  const [briefings, setBriefings] = useState<any>(null);
  const [showAlerts, setShowAlerts] = useState(false);
  const [alerts, setAlerts] = useState<any>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        // console.log('Available voices:', availableVoices);
        setVoices(availableVoices);
      }
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices(); // Initial call
  }, []);

  const speak = (text: string) => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
    }
    
    const utterance = new SpeechSynthesisUtterance(text);

    // Simple language detection
    let lang = 'en-US';
    if (/[\u0C00-\u0C7F]/.test(text)) { // Telugu range
      lang = 'te-IN';
    } else if (/[\u0C80-\u0CFF]/.test(text)) { // Kannada range
      lang = 'kn-IN';
    }

    // Voice selection
    let selectedVoice: SpeechSynthesisVoice | null = null;
    if (lang === 'te-IN') {
      selectedVoice = voices.find(voice => voice.lang === 'te-IN') || null;
    } else if (lang === 'kn-IN') {
      selectedVoice = voices.find(voice => voice.lang === 'kn-IN') || null;
    } else {
      // Prefer a female voice for English if available, otherwise first English voice
      selectedVoice = voices.find(voice => voice.lang && voice.lang.startsWith('en') && voice.name && voice.name.toLowerCase().includes('female')) 
        || voices.find(voice => voice.lang && voice.lang.startsWith('en')) || null;
    }

    // console.log('Detected language:', lang, 'Selected voice:', selectedVoice);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.lang = lang;
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const resetChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setLastResult(null);
    setQuestion('');
    if (isSpeaking) {
      window.speechSynthesis.cancel();
    }
  };

  const handleRoleChange = (role: keyof typeof ROLES) => {
    if (role !== selectedRole) {
      setSelectedRole(role);
      resetChat();
    }
  };

  const askQuestion = async (text?: string) => {
    const query = text || question;
    if (!query.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      from: 'user',
      text: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    if (!text) {
      setQuestion('');
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: query,
          role: selectedRole
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setLastResult({
        retrieved: data.retrieved || [],
        question: query
      });

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        from: 'ai',
        text: data.answer,
        sources: data.sources || [],
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error asking question:', error);
      const errorText = 'I encountered an error processing your question. Please try again.';
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        from: 'ai',
        text: errorText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const askWhy = async () => {
    if (!lastResult || isLoading) return;

    setIsLoading(true);
    try {
      const response = await fetch('/api/why', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: lastResult.question,
          role: selectedRole,
          docs: lastResult.retrieved
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      const whyMessage: Message = {
        id: Date.now().toString(),
        from: 'ai',
        text: data.why,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, whyMessage]);
    } catch (error) {
      console.error('Error getting explanation:', error);
      const errorText = 'I encountered an error getting the explanation. Please try again.';
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        from: 'ai',
        text: errorText,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getBriefings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/briefings?role=${selectedRole}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setBriefings(data);
      setShowBriefings(true);
    } catch (error) {
      console.error('Error getting briefings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAlerts = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/alerts?role=${selectedRole}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setAlerts(data);
      setShowAlerts(true);
    } catch (error) {
      console.error('Error getting alerts:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognition?.stop();
    } else {
      if (isSpeaking) {
        window.speechSynthesis.cancel();
      }
      recognition?.start();
    }
    setIsRecording(!isRecording);
  };

  useEffect(() => {
    if (!recognition) return;

    let finalTranscript = '';
    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      setQuestion(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
      if (finalTranscript.trim()) {
        askQuestion(finalTranscript);
      }
      finalTranscript = '';
    };
  }, []);

  return (
    <div className="flex h-screen bg-dashboard relative overflow-hidden">
      {/* SVG Metro Background (animated trains & tracks) */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden>
        <defs>
          <linearGradient id="railGrad" x1="0" x2="1">
            <stop offset="0" stopColor="rgba(0,224,255,0.08)" />
            <stop offset="1" stopColor="rgba(155,92,255,0.06)" />
          </linearGradient>
          <linearGradient id="trainBody" x1="0" x2="1">
            <stop offset="0" stopColor="#00e0ff" />
            <stop offset="1" stopColor="#9b5cff" />
          </linearGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Station silhouettes (subtle) */}
        <g opacity="0.06" fill="#ffffff">
          <rect x="20" y="60" width="220" height="18" rx="6"></rect>
          <rect x="300" y="120" width="180" height="14" rx="6"></rect>
          <rect x="760" y="40" width="260" height="20" rx="8"></rect>
          <rect x="1200" y="110" width="260" height="16" rx="6"></rect>
        </g>

        {/* tracks - repeating lines */}
        <g stroke="url(#railGrad)" strokeWidth="2" opacity="0.18" strokeLinecap="round">
          {Array.from({length: 12}).map((_, i) => {
            const y = 220 + i * 28;
            return <line key={i} x1="0" x2="1600" y1={y} y2={y}></line>;
          })}
        </g>

        {/* rails glow paths */}
        <g opacity="0.08" stroke="#00e0ff" strokeWidth="1.6" strokeLinecap="round">
          <path d="M-200 420 C 200 380, 400 460, 800 420 C 1200 380, 1400 460, 1800 420" strokeDasharray="8 60"></path>
        </g>

        {/* Animated train group - translate across screen */}
        <g className={`train-runner ${isLoading ? 'train-fast' : ''}`} filter="url(#glow)">
          {/* Wheels glow trails */}
          <g transform="translate(0,0)">
            {/* Simple stylized train (body + windows + lights) */}
            <g transform="scale(1.15)">
              <rect x="-120" y="380" width="260" height="64" rx="12" fill="url(#trainBody)"></rect>
              <rect x="-92" y="398" width="44" height="28" rx="4" fill="#051220"></rect>
              <rect x="-36" y="398" width="44" height="28" rx="4" fill="#051220"></rect>
              <rect x="20" y="398" width="44" height="28" rx="4" fill="#051220"></rect>
              <rect x="76" y="398" width="44" height="28" rx="4" fill="#051220"></rect>
              {/* headlight */}
              <circle cx="150" cy="412" r="10" fill="#fff7cc" opacity="0.9"></circle>
              <ellipse cx="40" cy="452" rx="28" ry="6" fill="rgba(0,224,255,0.12)"></ellipse>
            </g>
          </g>

          {/* faint trailing glow */}
          <g opacity="0.35">
            <ellipse cx="0" cy="460" rx="340" ry="22" fill="url(#trainBody)"></ellipse>
          </g>
        </g>

        {/* station signboard (floating) */}
        {/* <g transform="translate(1200,520)" opacity="0.08">
          <rect x="0" y="0" rx="8" width="300" height="64" fill="#ffffff"></rect>
          <text x="20" y="38" fill="#000000" fontSize="22" fontFamily="sans-serif">Central Control</text>
        </g> */}
      </svg>

      {/* Sidebar */}
      <aside className="w-72 bg-glass neon-glow border-r border-gray-800 flex flex-col z-10">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-2xl font-bold neon-text flex items-center gap-2">
            <MessageCircle />
            Saarthi
          </h1>
          <p className="text-sm text-gray-300 mt-1">KMRL Document Assistant</p>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Select Your Role</h3>
          <div className="space-y-3">
            {Object.entries(ROLES).map(([role, config]) => (
              <button
                key={role}
                onClick={() => handleRoleChange(role as keyof typeof ROLES)}
                className={`w-full p-3 rounded-xl text-left transition-all duration-200 transform hover:scale-103 ${
                  selectedRole === role
                    ? 'role-selected'
                    : 'bg-white/3 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{config.icon}</span>
                  <div>
                    <div className="font-medium text-white">{config.name}</div>
                    <div className="text-xs opacity-60">{role}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 mt-auto border-t border-white/10">
          <button
            onClick={getBriefings}
            disabled={isLoading}
            className="w-full p-3 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg hover:opacity-95 transition-colors flex items-center gap-2 justify-center disabled:opacity-50"
          >
            <FileText size={18} />
            Daily Briefing
          </button>
          <button
            onClick={getAlerts}
            disabled={isLoading}
            className="w-full p-3 mt-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg hover:opacity-95 transition-colors flex items-center gap-2 justify-center disabled:opacity-50"
          >
            <AlertCircle size={18} />
            ALERTS
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col z-10">
        {/* Header */}
        <div className="bg-glass border-b border-white/10 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{ROLES[selectedRole].icon}</span>
            <div>
              <h2 className="font-semibold text-lg text-white">{ROLES[selectedRole].name}</h2>
              <p className="text-sm text-gray-300">Role-specific document access</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            {lastResult && (
              <button
                onClick={askWhy}
                disabled={isLoading}
                className="px-4 py-2 bg-yellow-400/10 text-yellow-300 rounded-lg hover:bg-yellow-400/20 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <HelpCircle size={16} />
                Why?
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <section className="flex-1 overflow-y-auto p-6 space-y-4 relative">
          <div className="absolute inset-0 -z-10 opacity-0"></div>

          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`relative group max-w-2xl p-4 rounded-2xl ${
                  message.from === 'user'
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white shadow-neon'
                    : 'bg-white/6 border border-white/6 text-gray-200'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.text}</div>
                
                <button
                  onClick={() => speak(message.text)}
                  className={`absolute top-2 right-2 p-1 rounded-full bg-transparent text-transparent group-hover:text-current group-hover:bg-black/10 transition-all ${
                    message.from === 'user' ? 'text-white' : 'text-gray-300'
                  }`}
                  aria-label="Speak message"
                >
                  <Volume2 size={16} />
                </button>

                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-white/6">
                    <div className="text-sm text-gray-300 mb-2">Sources:</div>
                    <div className="flex flex-wrap gap-2">
                      {message.sources.map((source, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white/6 text-gray-200 text-xs rounded-full"
                        >
                          <FileText size={12} />
                          {source.source?.split('/').pop() || 'Document'} p.{source.page}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="text-xs opacity-60 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start items-center gap-3">
              <div className="p-3 rounded-full bg-white/6 animate-pulse">
                {/* small indicator while train background moves faster */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <circle cx="12" cy="12" r="6" stroke="#00e0ff" strokeWidth="2" strokeOpacity="0.9" />
                </svg>
              </div>
              <div className="text-gray-300">Thinking... (train accelerating)</div>
            </div>
          )}
        </section>

        {/* Input */}
        <div className="bg-glass border-t border-white/10 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && askQuestion()}
              placeholder={isRecording ? 'Listening...' : 'Ask me anything...'}
              className="flex-1 px-4 py-2 rounded-lg bg-black/50 border border-white/6 text-white focus:ring-2 focus:ring-cyan-400 outline-none"
              disabled={isLoading}
            />
            <button
              onClick={() => askQuestion()}
              disabled={!question.trim() || isLoading}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg hover:opacity-95 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={16} />
              Ask
            </button>
            {recognition && (
              <button
                onClick={toggleRecording}
                className={`p-3 rounded-lg transition-colors ${isRecording ? 'bg-red-500 text-white' : 'bg-white/6 text-white hover:bg-white/10'}`}
              >
                {isRecording ? <StopCircle size={20} /> : <Mic size={20} />}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Briefings Modal */}
      {showBriefings && briefings && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white/6 backdrop-blur-sm rounded-2xl max-w-4xl max-h-[80vh] overflow-y-auto border border-white/6">
            <div className="p-6 border-b border-white/6">
              <h3 className="text-xl font-semibold text-white">Daily Briefing - {briefings.role}</h3>
              <p className="text-sm text-gray-300">Generated: {new Date(briefings.generatedAt).toLocaleString()}</p>
            </div>
            
            <div className="p-6 space-y-6">
              {briefings.items.map((item: any, index: number) => (
                <div key={index} className="border border-white/6 rounded-lg p-4 bg-white/4">
                  <h4 className="font-medium text-white mb-2">{item.question}</h4>
                  <p className="text-gray-300 mb-3">{item.answer}</p>
                  {item.sources && item.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.sources.map((source: any, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white/6 text-gray-200 text-xs rounded-full"
                        >
                          <FileText size={12} />
                          {source.source?.split('/').pop() || 'Document'} p.{source.page}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t border-white/6 flex justify-end">
              <button
                onClick={() => setShowBriefings(false)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg hover:opacity-95 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Modal */}
      {showAlerts && alerts && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
          <div className="bg-white/6 backdrop-blur-sm rounded-2xl max-w-4xl max-h-[80vh] overflow-y-auto border border-white/6">
            <div className="p-6 border-b border-white/6">
              <h3 className="text-xl font-semibold text-white">ALERTS - {alerts.role}</h3>
              <p className="text-sm text-gray-300">Generated: {new Date(alerts.timestamp).toLocaleString()}</p>
            </div>
            
            <div className="p-6 space-y-6">
              {alerts.alerts.map((item: any, index: number) => (
                <div key={index} className="border border-white/6 rounded-lg p-4 bg-white/4">
                  <h4 className="font-medium text-white mb-2">{item.query}</h4>
                  <p className="text-gray-300 mb-3">{item.answer}</p>
                  {item.sources && item.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.sources.map((source: any, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white/6 text-gray-200 text-xs rounded-full"
                        >
                          <FileText size={12} />
                          {source.source?.split('/').pop() || 'Document'} p.{source.page}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <div className="p-6 border-t border-white/6 flex justify-end">
              <button
                onClick={() => setShowAlerts(false)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-purple-600 text-white rounded-lg hover:opacity-95 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
