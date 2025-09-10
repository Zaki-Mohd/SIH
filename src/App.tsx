import React, { useState } from 'react';
import { MessageCircle, User, FileText, AlertCircle, HelpCircle, Send, Loader2 } from 'lucide-react';

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

function App() {
  const [selectedRole, setSelectedRole] = useState<keyof typeof ROLES>('Director');
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<LastResult | null>(null);
  const [showBriefings, setShowBriefings] = useState(false);
  const [briefings, setBriefings] = useState<any>(null);

  const resetChat = () => {
    setMessages([INITIAL_MESSAGE]);
    setLastResult(null);
    setQuestion('');
  };

  const handleRoleChange = (role: keyof typeof ROLES) => {
    if (role !== selectedRole) {
      setSelectedRole(role);
      resetChat();
    }
  };

  const askQuestion = async () => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      from: 'user',
      text: question,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    const currentQuestion = question;
    setQuestion('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion,
          role: selectedRole
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      setLastResult({
        retrieved: data.retrieved || [],
        question: currentQuestion
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
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        from: 'ai',
        text: 'I encountered an error processing your question. Please try again.',
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
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        from: 'ai',
        text: 'I encountered an error getting the explanation. Please try again.',
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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <MessageCircle className="text-blue-600" />
            Saarthi
          </h1>
          <p className="text-sm text-gray-600 mt-1">KMRL Document Assistant</p>
        </div>

        <div className="p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Select Your Role</h3>
          <div className="space-y-2">
            {Object.entries(ROLES).map(([role, config]) => (
              <button
                key={role}
                onClick={() => handleRoleChange(role as keyof typeof ROLES)}
                className={`w-full p-3 rounded-lg text-left transition-all duration-200 hover:scale-105 ${
                  selectedRole === role
                    ? `${config.color} shadow-md border-2 border-current`
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{config.icon}</span>
                  <div>
                    <div className="font-medium">{config.name}</div>
                    <div className="text-xs opacity-75">{role}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="p-4 mt-auto border-t border-gray-200">
          <button
            onClick={getBriefings}
            disabled={isLoading}
            className="w-full p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 justify-center disabled:opacity-50"
          >
            <FileText size={18} />
            Daily Briefing
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{ROLES[selectedRole].icon}</span>
              <div>
                <h2 className="font-semibold text-gray-900">{ROLES[selectedRole].name}</h2>
                <p className="text-sm text-gray-600">Role-specific document access</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              {lastResult && (
                <button
                  onClick={askWhy}
                  disabled={isLoading}
                  className="px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  <HelpCircle size={16} />
                  Why?
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl p-4 rounded-lg ${
                  message.from === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.text}</div>
                
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-sm text-gray-600 mb-2">Sources:</div>
                    <div className="flex flex-wrap gap-2">
                      {message.sources.map((source, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
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
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 p-4 rounded-lg flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} />
                <span className="text-gray-600">Thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && askQuestion()}
              placeholder="Ask me anything about KMRL documents..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
            />
            <button
              onClick={askQuestion}
              disabled={!question.trim() || isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Send size={16} />
              Ask
            </button>
          </div>
        </div>
      </div>

      {/* Briefings Modal */}
      {showBriefings && briefings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-y-auto m-4">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-xl font-semibold">Daily Briefing - {briefings.role}</h3>
              <p className="text-gray-600">Generated: {new Date(briefings.generatedAt).toLocaleString()}</p>
            </div>
            
            <div className="p-6 space-y-6">
              {briefings.items.map((item: any, index: number) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">{item.question}</h4>
                  <p className="text-gray-700 mb-3">{item.answer}</p>
                  {item.sources && item.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {item.sources.map((source: any, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
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
            
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowBriefings(false)}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
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
