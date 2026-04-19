import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Brain, ChevronRight, Loader, Square } from 'lucide-react';

import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { api, getApiErrorMessage } from '../lib/api';
import { getCurrentSessionId, getCurrentSubmissionId, setCurrentSessionId } from '../lib/sessionStore';

export default function Interview() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const [sessionId, setSessionIdState] = useState(getCurrentSessionId());
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking]);

  useEffect(() => {
    async function ensureSession() {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }

      const existingSessionId = getCurrentSessionId();

      if (existingSessionId) {
        try {
          const response = await api.get(`/sessions/${existingSessionId}`);
          const session = response.data.session;
          setSessionIdState(session.id);
          setMessages(session.messages || []);
          setIsComplete(Boolean(session.summary) || session.status !== 'ACTIVE');
        } catch (err) {
          setError(getApiErrorMessage(err, 'Unable to load the interview session.'));
        } finally {
          setIsLoading(false);
        }
        return;
      }

      const submissionId = getCurrentSubmissionId();
      if (!submissionId) {
        setError('No submission was found. Please upload content first.');
        setIsLoading(false);
        return;
      }

      try {
        const response = await api.post('/sessions', { submissionId });
        const session = response.data.session;
        setCurrentSessionId(session.id);
        setSessionIdState(session.id);
        setMessages(session.messages || []);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Unable to start the interview session.'));
      } finally {
        setIsLoading(false);
      }
    }

    ensureSession();
  }, [isAuthenticated, navigate]);

  const sendMessage = async () => {
    if (!input.trim() || isThinking || isComplete || !sessionId) {
      return;
    }

    setIsThinking(true);
    setError('');

    try {
      const response = await api.post(`/sessions/${sessionId}/message`, {
        content: input.trim(),
      });

      const updatedSession = response.data.session;
      setMessages(updatedSession.messages || []);
      setIsComplete(Boolean(updatedSession.summary) || updatedSession.status !== 'ACTIVE');
      setInput('');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to send your feedback right now.'));
    } finally {
      setIsThinking(false);
    }
  };

  const endSession = async () => {
    if (!sessionId || isThinking) {
      return;
    }

    setIsThinking(true);
    setError('');

    try {
      await api.post(`/sessions/${sessionId}/end`, {
        reason: 'Session ended by user from the interview page',
      });
      setIsComplete(true);
      navigate('/summary');
    } catch (err) {
      setError(getApiErrorMessage(err, 'Unable to end the session right now.'));
    } finally {
      setIsThinking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <Loader size={18} className="animate-spin" />
          Preparing your interview session...
        </div>
      </div>
    );
  }

  const totalQuestions = 4;
  const answeredQuestions = messages.filter(message => message.role === 'user').length;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-4xl mx-auto px-4">
      <div className="flex items-center justify-between py-4 border-b border-outline-variant/15">
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-[pulse_2s_ease-in-out_infinite]" />
            <div className="w-10 h-10 rounded-full bg-surface-high flex items-center justify-center relative">
              <Brain size={18} className="text-primary" />
            </div>
          </div>
          <div>
            <p className="font-headline font-semibold text-sm text-on-surface">FeedbackAI Interviewer</p>
            <p className="text-xs text-on-surface-variant flex items-center gap-1.5">
              {isThinking
                ? <><Loader size={10} className="animate-spin" /> Thinking...</>
                : <><span className="w-1.5 h-1.5 rounded-full bg-tertiary inline-block" /> Active session</>
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2">
            {[...Array(totalQuestions)].map((_, i) => (
              <div
                key={i}
                className={`w-8 h-1.5 rounded-full transition-all duration-500 ${
                  i < answeredQuestions ? 'bg-tertiary' : i === answeredQuestions && !isComplete ? 'bg-primary animate-pulse' : 'bg-surface-high'
                }`}
              />
            ))}
          </div>
          <Badge variant="muted" className="text-xs">
            Q {Math.min(answeredQuestions + 1, totalQuestions)} / {totalQuestions}
          </Badge>
          <Button variant="secondary" className="gap-2 py-2 px-4" onClick={endSession}>
            <Square size={14} />
            End Session
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6 flex flex-col gap-5 no-scrollbar">
        {error && (
          <div className="rounded-2xl bg-error/10 text-error px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {messages.map(({ id, role, content, createdAt }) => (
          <div key={id} className={`flex gap-3 ${role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center ${role === 'assistant' ? 'bg-primary/15' : 'bg-surface-highest'}`}>
              {role === 'assistant'
                ? <Brain size={14} className="text-primary" />
                : <span className="text-xs font-bold text-on-surface-variant">U</span>}
            </div>

            <div className={`max-w-[75%] flex flex-col gap-1 ${role === 'user' ? 'items-end' : 'items-start'}`}>
              <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                role === 'assistant'
                  ? 'bg-surface-container text-on-surface rounded-tl-sm'
                  : 'bg-primary-gradient text-on-primary rounded-tr-sm'
              }`}>
                {content}
              </div>
              <span className="text-[10px] text-on-surface-variant px-1">
                {createdAt ? new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
              </span>
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <Brain size={14} className="text-primary" />
            </div>
            <div className="bg-surface-container px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5">
              {[0, 150, 300].map(delay => (
                <span key={delay} className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </div>
          </div>
        )}

        {isComplete && (
          <div className="flex justify-center mt-4">
            <Button variant="primary" onClick={() => navigate('/summary')} className="gap-2">
              View Session Summary
              <ChevronRight size={16} />
            </Button>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      <div className="py-4 border-t border-outline-variant/15">
        <div className="flex gap-3 items-end">
          <div className="flex-1 bg-surface-container rounded-2xl px-4 py-3 flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder={isComplete ? 'Session complete' : 'Share your feedback...'}
              disabled={isComplete}
              rows={1}
              className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-on-surface-variant/50 resize-none outline-none max-h-30 leading-relaxed font-body"
              style={{ scrollbarWidth: 'none' }}
            />
          </div>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isThinking || isComplete}
            className="w-11 h-11 rounded-full flex items-center justify-center bg-primary-gradient text-on-primary shadow-[0_0_20px_-4px] shadow-primary-dim/50 hover:scale-110 hover:shadow-[0_0_28px_-4px] hover:shadow-primary-dim/70 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
          >
            <Send size={16} />
          </button>
        </div>
        <p className="text-[10px] text-on-surface-variant mt-2 text-center font-label">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
