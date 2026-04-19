import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Download, ArrowLeft, CheckCircle, TrendingUp, AlertCircle, Lightbulb, Clock, Star, Loader } from 'lucide-react';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { api, getApiErrorMessage } from '../lib/api';
import { getCurrentSessionId } from '../lib/sessionStore';

const insightMeta = {
  strength: { icon: CheckCircle, color: 'text-tertiary', bg: 'bg-tertiary/10', badge: 'tertiary', label: 'Strength' },
  weakness: { icon: AlertCircle, color: 'text-error', bg: 'bg-error/10', badge: 'error', label: 'Improvement Area' },
  recommendation: { icon: Lightbulb, color: 'text-secondary', bg: 'bg-secondary/10', badge: 'secondary', label: 'Recommendation' },
};

export default function Summary() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadSummary() {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }

      const sessionId = getCurrentSessionId();
      if (!sessionId) {
        setError('No completed session was found yet. Finish an interview session first.');
        setLoading(false);
        return;
      }

      try {
        const response = await api.get(`/summaries/${sessionId}`);
        setSummary(response.data.summary);
      } catch (err) {
        setError(getApiErrorMessage(err, 'Unable to load the session summary right now.'));
      } finally {
        setLoading(false);
      }
    }

    loadSummary();
  }, [isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <Loader size={18} className="animate-spin" />
          Loading summary...
        </div>
      </div>
    );
  }

  const session = summary?.session;
  const submission = session?.submission;
  const timeline = summary?.sentimentTimeline || [];
  const strengths = Array.isArray(summary?.strengths) ? summary.strengths : [];
  const weaknesses = Array.isArray(summary?.weaknesses) ? summary.weaknesses : [];
  const recommendations = Array.isArray(summary?.recommendations) ? summary.recommendations : [];
  const insightCards = [
    ...strengths.map(text => ({ type: 'strength', text })),
    ...weaknesses.map(text => ({ type: 'weakness', text })),
    ...recommendations.map(text => ({ type: 'recommendation', text })),
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-10 max-w-5xl mx-auto">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-20 right-1/4 w-[500px] h-[300px] rounded-full bg-primary/8 blur-[100px]" />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <button onClick={() => navigate('/interview')} className="flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary transition-colors duration-200 mb-3 font-label">
            <ArrowLeft size={13} />
            Back to Interview
          </button>
          <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-1">Session Report</p>
          <h1 className="font-headline font-bold text-3xl text-on-surface">Session Summary</h1>
          <p className="text-on-surface-variant mt-1 text-sm">
            {submission?.title || 'Untitled submission'} · Session {session?.id || 'Unavailable'}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" className="gap-2 py-2.5" onClick={() => window.print()}>
            <Download size={15} />
            Export
          </Button>
        </div>
      </div>

      {error && (
        <Card level="default" className="mb-6">
          <p className="text-sm text-error">{error}</p>
        </Card>
      )}

      {summary && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { icon: Brain, label: 'Engagement', value: summary.engagementLevel || 'n/a', badge: <Badge variant="tertiary">Session Summary</Badge> },
              { icon: Clock, label: 'Status', value: session?.status || 'n/a', badge: null },
              { icon: TrendingUp, label: 'Sentiment', value: session?.overallSentiment || 'n/a', badge: null },
              { icon: Star, label: 'Confidence', value: summary.summaryConfidence || 'n/a', badge: <Badge variant="primary">AI Generated</Badge> },
            ].map(({ icon: Icon, label, value, badge }) => (
              <Card key={label} level="default">
                <Icon size={18} className="text-primary mb-3" />
                <p className="font-headline font-bold text-xl text-on-surface mb-0.5 capitalize">{String(value).replaceAll('_', ' ')}</p>
                <p className="text-xs text-on-surface-variant font-label mb-2">{label}</p>
                {badge}
              </Card>
            ))}
          </div>

          <Card level="default" className="mb-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-1">Summary</p>
                <p className="font-headline font-semibold text-lg text-on-surface">Stored feedback overview</p>
              </div>
              <Badge variant="tertiary">{timeline.length} user turns</Badge>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">{summary.shortSummary}</p>
          </Card>

          <Card level="default" className="mb-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-1">Sentiment Over Session</p>
                <p className="font-headline font-semibold text-lg text-on-surface">User engagement progression</p>
              </div>
              <Badge variant="tertiary">{session?.continueSignalFinal || 'continue'}</Badge>
            </div>
            <div className="flex items-end gap-2 h-20">
              {timeline.length > 0 ? timeline.map((item, i) => {
                const score = item.sentiment === 'engaged' ? 90 : item.sentiment === 'hesitant' ? 60 : item.sentiment === 'frustrated' ? 35 : item.sentiment === 'wants_to_stop' ? 20 : 70;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                    <div className="w-full rounded-lg bg-primary-gradient cursor-pointer hover:opacity-90 transition-opacity" style={{ height: `${score}%`, minHeight: '6px' }} />
                    <span className="text-[10px] text-on-surface-variant font-label">Q{i + 1}</span>
                  </div>
                );
              }) : (
                <p className="text-sm text-on-surface-variant">No timeline data is available yet.</p>
              )}
            </div>
          </Card>

          <div className="mb-8">
            <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-4">AI-Generated Insights</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insightCards.length > 0 ? insightCards.map((insight, index) => {
                const meta = insightMeta[insight.type];
                const Icon = meta.icon;
                return (
                  <Card key={`${insight.type}-${index}`} level="default" className="flex flex-col gap-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-xl ${meta.bg} flex items-center justify-center`}>
                        <Icon size={17} className={meta.color} />
                      </div>
                      <Badge variant={meta.badge} className="text-[11px]">
                        {meta.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{insight.text}</p>
                  </Card>
                );
              }) : (
                <Card level="default">
                  <p className="text-sm text-on-surface-variant">No summary insights have been stored yet.</p>
                </Card>
              )}
            </div>
          </div>

          <Card level="default">
            <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-6">Submission Context</p>
            <div className="flex flex-col gap-5">
              <div>
                <Badge variant="primary" className="mb-2">Prompt</Badge>
                <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">{submission?.originalPrompt || 'No prompt stored.'}</p>
              </div>
              <div>
                <Badge variant="muted" className="mb-2">Generated Content</Badge>
                <p className="text-sm text-on-surface-variant leading-relaxed whitespace-pre-wrap">{submission?.generatedContent || 'No generated content stored.'}</p>
              </div>
            </div>
          </Card>
        </>
      )}

      <div className="flex flex-col md:flex-row gap-4 mt-8 items-center justify-between">
        <p className="text-sm text-on-surface-variant">This summary is stored for later admin review and export.</p>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => navigate('/upload')}>New Session</Button>
          <Button variant="primary" onClick={() => navigate('/dashboard')} className="gap-2">
            View Dashboard
            <Brain size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}
