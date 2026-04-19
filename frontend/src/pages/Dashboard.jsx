import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart3, TrendingUp, ClipboardList, MessageSquare, Clock, Download, Filter, Eye, FileText, Video, Music, Code, ChevronUp, Loader, Shield, PlusCircle, Inbox } from 'lucide-react';

import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { api, getApiErrorMessage } from '../lib/api';
import { setCurrentSessionId, setCurrentSubmissionId } from '../lib/sessionStore';

const typeIcons = { pdf: FileText, text: FileText, audio: Music, video: Video, code: Code };
const scoreColor = (v) => v >= 80 ? 'text-tertiary' : v >= 60 ? 'text-primary' : 'text-error';

export default function Dashboard() {
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminSessions, setAdminSessions] = useState([]);
  const [userSubmissions, setUserSubmissions] = useState([]);
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      if (!isAuthenticated) {
        navigate('/login');
        return;
      }

      setLoading(true);
      setError('');

      try {
        if (user?.role === 'ADMIN') {
          const response = await api.get('/admin/sessions');
          setAdminSessions(response.data.sessions || []);
        } else {
          const response = await api.get('/submissions');
          setUserSubmissions(response.data.submissions || []);
        }
      } catch (err) {
        setError(getApiErrorMessage(err, 'Unable to load dashboard data.'));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [isAuthenticated, navigate, user?.role]);

  const adminStats = useMemo(() => {
    const completed = adminSessions.filter(session => session.status !== 'ACTIVE');
    const avgCompletion = completed.length > 0
      ? Math.round(completed.reduce((sum, session) => sum + (session.completionScore || 0), 0) / completed.length)
      : 0;

    return [
      { label: 'Evaluation Sessions', value: String(adminSessions.length), change: `${completed.length} closed`, icon: ClipboardList, positive: true },
      { label: 'Avg. Completion', value: `${avgCompletion}%`, change: 'summary coverage', icon: TrendingUp, positive: true },
      { label: 'Summaries Stored', value: String(adminSessions.filter(session => session.summary).length), change: 'ready for export', icon: MessageSquare, positive: true },
      { label: 'Active Sessions', value: String(adminSessions.filter(session => session.status === 'ACTIVE').length), change: 'in progress', icon: Clock, positive: false },
    ];
  }, [adminSessions]);

  const filters = ['all', 'pdf', 'text', 'audio', 'video', 'code'];
  const filteredAdminSessions = activeFilter === 'all'
    ? adminSessions
    : adminSessions.filter(session => session.submission?.inputType === activeFilter);
  const filteredUserSubmissions = activeFilter === 'all'
    ? userSubmissions
    : userSubmissions.filter(submission => submission.inputType === activeFilter);

  const openSession = (sessionId) => {
    setCurrentSessionId(sessionId);
    navigate('/summary');
  };

  const exportSummaries = () => {
    const params = {};
    if (activeFilter !== 'all') {
      params.inputType = activeFilter;
    }
    params.format = 'csv';

    api.get('/admin/exports/summaries', {
      params,
      responseType: 'blob',
    }).then((response) => {
      const blobUrl = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'session-summaries.csv';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(blobUrl);
    }).catch((err) => {
      setError(getApiErrorMessage(err, 'Unable to export summaries right now.'));
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="flex items-center gap-3 text-on-surface-variant">
          <Loader size={18} className="animate-spin" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-[calc(100vh-4rem)] px-6 py-10 max-w-6xl mx-auto">
        <div className="mb-10">
          <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-1">My Workspace</p>
          <h1 className="font-headline font-bold text-3xl text-on-surface">My Submissions</h1>
          <p className="text-sm text-on-surface-variant mt-1">Your account is set up as a user, so this view focuses on the content you have submitted.</p>
        </div>

        {error && (
          <Card level="default" className="mb-6">
            <p className="text-sm text-error">{error}</p>
          </Card>
        )}

        <Card level="default" className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-1">Submission Log</p>
              <p className="font-headline font-semibold text-lg text-on-surface">Recent uploads</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {filters.map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-full text-xs font-label font-medium capitalize transition-all duration-200 ${
                    activeFilter === f ? 'bg-primary text-on-primary' : 'bg-surface-high text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {filteredUserSubmissions.length > 0 ? filteredUserSubmissions.map(submission => {
              const Icon = typeIcons[submission.inputType] || FileText;
              return (
                <div key={submission.id} className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface-high/40">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm text-on-surface truncate">{submission.title}</p>
                      <p className="text-xs text-on-surface-variant mt-1">
                        {submission.sourceModelLabel} · {submission.inputType} · {new Date(submission.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="secondary"
                    className="py-2"
                    onClick={() => {
                      setCurrentSubmissionId(submission.id);
                      setCurrentSessionId(null);
                      navigate('/interview');
                    }}
                  >
                    Continue
                  </Button>
                </div>
              );
            }) : (
              <div className="flex flex-col items-center justify-center py-14 gap-5">
                <div className="w-16 h-16 rounded-2xl bg-surface-high flex items-center justify-center">
                  <Inbox size={28} className="text-on-surface-variant/50" />
                </div>
                <div className="text-center">
                  <p className="font-headline font-semibold text-on-surface mb-1">
                    {activeFilter === 'all' ? 'No submissions yet' : `No ${activeFilter} submissions yet`}
                  </p>
                  <p className="text-sm text-on-surface-variant max-w-xs">
                    {activeFilter === 'all'
                      ? 'Upload your first GenAI output to start a feedback session.'
                      : `Switch the filter to see submissions of a different type, or upload a new ${activeFilter} submission.`}
                  </p>
                </div>
                <Button
                  variant="primary"
                  className="gap-2 mt-2"
                  onClick={() => navigate('/upload')}
                >
                  <PlusCircle size={15} />
                  Upload Content
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-1">Admin Console</p>
          <h1 className="font-headline font-bold text-3xl text-on-surface">Model Evaluation Dashboard</h1>
          <p className="text-sm text-on-surface-variant mt-1">Review stored feedback summaries and export them by input type or model label.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="secondary" className="gap-2 py-2.5 px-5">
            <Filter size={15} />
            {activeFilter === 'all' ? 'All Inputs' : activeFilter}
          </Button>
          <Button variant="primary" className="gap-2 py-2.5" onClick={exportSummaries}>
            <Download size={15} />
            Export Report
          </Button>
        </div>
      </div>

      {error && (
        <Card level="default" className="mb-6">
          <p className="text-sm text-error">{error}</p>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {adminStats.map(({ label, value, change, icon: Icon, positive }) => (
          <Card key={label} level="default" className="group hover:bg-surface-high transition-all duration-300">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors duration-300">
                <Icon size={18} className="text-primary" />
              </div>
              <Badge variant={positive ? 'tertiary' : 'error'} className="text-[11px] flex items-center gap-1">
                {positive && <ChevronUp size={10} />}{change}
              </Badge>
            </div>
            <p className="font-headline font-bold text-2xl text-on-surface">{value}</p>
            <p className="text-xs text-on-surface-variant mt-1 font-label">{label}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card level="default" className="md:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-1">Stored Summary Trend</p>
              <p className="font-headline font-bold text-xl text-on-surface">{filteredAdminSessions.length} sessions in current view</p>
            </div>
            <Badge variant="primary">Live API Data</Badge>
          </div>
          <div className="flex items-end gap-3 h-32">
            {filteredAdminSessions.slice(0, 7).map((session, i) => (
              <div key={session.id} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-lg bg-primary-gradient opacity-80 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
                  style={{ height: `${Math.max(session.completionScore || 10, 8)}%`, minHeight: '8px' }}
                  title={`${session.submission?.title}: ${session.completionScore || 0}%`}
                />
                <span className="text-xs text-on-surface-variant font-label">S{i + 1}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card level="default">
          <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-6">Filter Notes</p>
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Shield size={16} className="text-primary" />
              <p className="text-sm text-on-surface-variant">Exports are filtered by input type and include only stored summaries.</p>
            </div>
            <div className="flex items-center gap-3">
              <BarChart3 size={16} className="text-tertiary" />
              <p className="text-sm text-on-surface-variant">Input type is currently treated as the reporting model bucket you requested.</p>
            </div>
          </div>
        </Card>
      </div>

      <Card level="default">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-1">Evaluation Log</p>
            <p className="font-headline font-semibold text-lg text-on-surface">Recent Review Sessions</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {filters.map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 py-1.5 rounded-full text-xs font-label font-medium capitalize transition-all duration-200 ${
                  activeFilter === f ? 'bg-primary text-on-primary' : 'bg-surface-high text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left">
                {['Session', 'Submission', 'Model Label', 'Score', 'Status', 'Time', ''].map(h => (
                  <th key={h} className="pb-4 pr-4 text-xs font-label uppercase tracking-widest text-on-surface-variant last:text-right">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/10">
              {filteredAdminSessions.map((session) => {
                const Icon = typeIcons[session.submission?.inputType] || FileText;
                return (
                  <tr key={session.id} className="hover:bg-surface-high/40 transition-colors duration-200 group">
                    <td className="py-4 pr-4 text-xs text-on-surface-variant font-label">{session.id.slice(-8)}</td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Icon size={13} className="text-primary" />
                        </div>
                        <span className="text-sm text-on-surface truncate max-w-[220px]">{session.submission?.title}</span>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <Badge variant="muted" className="text-[11px]">{session.submission?.sourceModelLabel}</Badge>
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-headline font-semibold text-sm ${scoreColor(session.completionScore || 0)}`}>{session.completionScore || 0}%</span>
                        <div className="w-16 h-1 rounded-full bg-surface-high overflow-hidden hidden md:block">
                          <div
                            className={`h-full rounded-full ${session.completionScore >= 80 ? 'bg-tertiary' : session.completionScore >= 60 ? 'bg-primary' : 'bg-error'}`}
                            style={{ width: `${session.completionScore || 0}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 pr-4">
                      <Badge variant={session.status === 'COMPLETED' ? 'tertiary' : session.status === 'ACTIVE' ? 'primary' : 'error'} className="capitalize">
                        {session.status.toLowerCase().replace('-', ' ')}
                      </Badge>
                    </td>
                    <td className="py-4 pr-4 text-xs text-on-surface-variant whitespace-nowrap">{new Date(session.startedAt).toLocaleString()}</td>
                    <td className="py-4 text-right">
                      <button className="text-on-surface-variant hover:text-primary transition-colors duration-200 opacity-0 group-hover:opacity-100" onClick={() => openSession(session.id)}>
                        <Eye size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredAdminSessions.length === 0 && (
            <p className="text-sm text-on-surface-variant py-6">No admin sessions are available yet for this filter.</p>
          )}
        </div>
      </Card>
    </div>
  );
}
