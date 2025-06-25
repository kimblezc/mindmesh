import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './App.css';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  domain: string;
}

interface ChatRequest {
  message: string;
  domain: string;
  user_id: string;
}

interface ChatResponse {
  response: string;
  domain: string;
  timestamp: string;
  ai_powered: boolean;
  error?: string;
}

const DOMAIN_OPTIONS = [
  { value: 'general', label: '🤖 General', description: 'General purpose AI assistant' },
  { value: 'legal', label: '⚖️ Legal', description: 'Legal information and guidance' },
  { value: 'dnd', label: '🎲 D&D', description: 'Dungeons & Dragons expert' },
  { value: 'cooking', label: '👨‍🍳 Cooking', description: 'Culinary arts and recipes' },
  { value: 'personal', label: '📋 Personal', description: 'Productivity and self-improvement' }
];

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('general');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    checkConnection();
    const welcomeMessage: Message = {
      id: '0',
      text: 'Welcome to Mindmesh! I\'m your AI assistant with specialized knowledge domains. Select a domain and start chatting!',
      isUser: false,
      timestamp: new Date(),
      domain: 'general'
    };
    setMessages([welcomeMessage]);
  }, []);

  const checkConnection = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/health`);
      setIsConnected(response.data.status === 'healthy');
    } catch (error) {
      setIsConnected(false);
      console.error('Connection check failed:', error);
    }
  };

  const generateUserId = () => {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: currentMessage,
      isUser: true,
      timestamp: new Date(),
      domain: selectedDomain
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = currentMessage;
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const chatRequest: ChatRequest = {
        message: messageToSend,
        domain: selectedDomain,
        user_id: generateUserId()
      };

      const response = await axios.post<ChatResponse>(`${API_BASE_URL}/chat`, chatRequest);

      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response.data.response,
        isUser: false,
        timestamp: new Date(),
        domain: response.data.domain
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Sorry, I encountered an error. Please check your connection and try again.',
        isUser: false,
        timestamp: new Date(),
        domain: selectedDomain
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    const currentDomainInfo = DOMAIN_OPTIONS.find(d => d.value === selectedDomain);
    const welcomeMessage: Message = {
      id: '0',
      text: `Switched to ${currentDomainInfo?.label} mode. How can I help you?`,
      isUser: false,
      timestamp: new Date(),
      domain: selectedDomain
    };
    setMessages([welcomeMessage]);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const currentDomain = DOMAIN_OPTIONS.find(d => d.value === selectedDomain);

  return (
    <div className="App">
      <div className="mindmesh-container">
        <header className="mindmesh-header">
          <div className="header-content">
            <h1 className="mindmesh-title">
              <span className="title-gradient">MindMesh</span>
              <span className="subtitle">AI Knowledge Domains</span>
            </h1>
            <div className="connection-status">
              <div className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}></div>
              <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </header>

        <div className="domain-selector">
          <div className="domain-tabs">
            {DOMAIN_OPTIONS.map((domain) => (
              <button
                key={domain.value}
                className={`domain-tab ${selectedDomain === domain.value ? 'active' : ''}`}
                onClick={() => {
                  setSelectedDomain(domain.value);
                  clearChat();
                }}
                title={domain.description}
              >
                {domain.label}
              </button>
            ))}
          </div>
          <div className="current-domain-info">
            <span className="domain-description">{currentDomain?.description}</span>
          </div>
        </div>

        <div className="chat-container">
          <div className="messages-container">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.isUser ? 'user-message' : 'ai-message'}`}
              >
                <div className="message-content">
                  <div className="message-text">{message.text}</div>
                  <div className="message-meta">
                    <span className="message-time">{formatTime(message.timestamp)}</span>
                    {!message.isUser && (
                      <span className="message-domain">
                        {DOMAIN_OPTIONS.find(d => d.value === message.domain)?.label}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message ai-message">
                <div className="message-content">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="input-container">
            <div className="input-wrapper">
              <input
                ref={inputRef}
                type="text"
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={`Ask me anything in ${currentDomain?.label} mode...`}
                disabled={isLoading || !isConnected}
                className="message-input"
              />
              <button
                onClick={sendMessage}
                disabled={!currentMessage.trim() || isLoading || !isConnected}
                className="send-button"
              >
                {isLoading ? (
                  <div className="spinner"></div>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22,2 15,22 11,13 2,9"></polygon>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        <footer className="mindmesh-footer">
          <p>Powered by OpenAI GPT-3.5-turbo • Built with React & FastAPI</p>
        </footer>
      </div>
    </div>
  );
}

export default App;