import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload as UploadIcon, FileText, Music, Video, Code, X, CheckCircle, Loader, ArrowRight } from 'lucide-react';

import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';
import { api, getApiErrorMessage } from '../lib/api';
import { setCurrentSessionId, setCurrentSubmissionId } from '../lib/sessionStore';

const acceptedTypes = [
  { icon: FileText, label: 'PDF / Text', accept: '.pdf,.txt,.doc,.docx', color: 'text-primary' },
  { icon: Music, label: 'Audio', accept: '.mp3,.wav,.m4a,.ogg', color: 'text-tertiary' },
  { icon: Video, label: 'Video', accept: '.mp4,.webm,.mov', color: 'text-secondary' },
  { icon: Code, label: 'Images / Art', accept: '.jpg,.jpeg,.png,.webp,.svg', color: 'text-primary-dim' },
];

const STATES = { idle: 'idle', uploading: 'uploading', success: 'success' };

export default function Upload() {
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploadState, setUploadState] = useState(STATES.idle);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: 'New Feedback Session',
    originalPrompt: '',
    generatedContent: '',
    inputType: 'text',
    sourceModelLabel: 'GenAI Prototype',
  });
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) {
      handleFile(dropped);
    }
  };

  const handleFile = (nextFile) => {
    setFile(nextFile);
    setUploadState(STATES.idle);
    setProgress(0);
  };

  const handleChange = (field) => (e) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleUpload = async () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    // Validation: Title and Prompt are always required.
    // Generated Content is required UNLESS a file is attached.
    if (!form.title || !form.originalPrompt || (!form.generatedContent && !file)) {
      setError('Please fill in the prompt and either paste the content or attach a file.');
      return;
    }

    const finalGeneratedContent = form.generatedContent || `[File Attachment: ${file?.name || 'Uploaded Content'}]`;

    setError('');
    setUploadState(STATES.uploading);
    setProgress(20);

    try {
      const payload = new FormData();
      payload.append('title', form.title);
      payload.append('originalPrompt', form.originalPrompt);
      payload.append('generatedContent', finalGeneratedContent);
      payload.append('inputType', form.inputType);
      payload.append('sourceModelLabel', form.sourceModelLabel);

      if (file) {
        payload.append('file', file);
      }

      const response = await api.post('/submissions', payload, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setProgress(100);
      setCurrentSubmissionId(response.data.submission.id);
      setCurrentSessionId(null);
      setTimeout(() => setUploadState(STATES.success), 250);
    } catch (err) {
      setUploadState(STATES.idle);
      setProgress(0);
      setError(getApiErrorMessage(err, 'Unable to save this submission right now.'));
    }
  };

  const fileSize = (bytes) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-10 max-w-4xl mx-auto">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-primary/8 blur-[100px]" />
      </div>

      <div className="mb-10">
        <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-1">Step 1 of 2</p>
        <h1 className="font-headline font-bold text-3xl text-on-surface">Gather Feedback</h1>
        <p className="text-on-surface-variant mt-2 max-w-2xl">
          Paste the original prompt and the AI output below. 
          <strong> How it works:</strong> Our diagnostic model uses this content as context to conduct a deep-dive interview, 
          identifying strengths, hallucinations, or areas for improvement in your AI's response.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="flex flex-col gap-2">
          <label htmlFor="original-prompt" className="text-xs font-label font-medium text-on-surface-variant uppercase tracking-[0.08em]">
            1. User's Original Prompt
          </label>
          <textarea
            id="original-prompt"
            rows={6}
            value={form.originalPrompt}
            onChange={handleChange('originalPrompt')}
            placeholder="What did the user ask the AI?"
            className="w-full rounded-2xl bg-surface-container px-4 py-4 text-on-surface text-sm outline-none border border-outline-variant/20 focus:border-primary resize-y"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="generated-content" className="text-xs font-label font-medium text-on-surface-variant uppercase tracking-[0.08em]">
            2. AI Generated Content
          </label>
          <textarea
            id="generated-content"
            rows={6}
            value={form.generatedContent}
            onChange={handleChange('generatedContent')}
            placeholder="What was the AI's response? (Paste text, or attach a file below)"
            className="w-full rounded-2xl bg-surface-container px-4 py-4 text-on-surface text-sm outline-none border border-outline-variant/20 focus:border-primary resize-y"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6 mb-8 p-6 rounded-2xl bg-surface-container/30 border border-outline-variant/10">
        <div className="flex-1 min-w-[200px]">
          <label htmlFor="input-type" className="text-xs font-label font-medium text-on-surface-variant uppercase tracking-[0.08em] block mb-2">
            Content Category
          </label>
          <select
            id="input-type"
            value={form.inputType}
            onChange={handleChange('inputType')}
            className="w-full bg-transparent py-2 text-on-surface text-sm font-body outline-none border-b border-outline-variant/20 focus:border-b-primary"
          >
          <option value="text">Text / Prompt</option>
          <option value="pdf">Document (PDF)</option>
          <option value="image">Image / UI Design</option>
          <option value="audio">Audio / Voice</option>
          <option value="video">Video / Animation</option>
          <option value="code">Code / Script</option>
        </select>
      </div>
        
      <div className="flex-1 min-w-[200px]">
          <label htmlFor="submission-title" className="text-xs font-label font-medium text-on-surface-variant uppercase tracking-[0.08em] block mb-2">
            Session Title (Optional)
          </label>
          <input
            id="submission-title"
            type="text"
            value={form.title}
            onChange={handleChange('title')}
            className="w-full bg-transparent py-2 text-on-surface text-sm font-body outline-none border-b border-outline-variant/20 focus:border-b-primary"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {acceptedTypes.map(({ icon: Icon, label, color }) => (
          <div key={label} className="flex items-center gap-2.5 p-3.5 rounded-xl bg-surface-container">
            <Icon size={16} className={color} />
            <span className="text-xs text-on-surface-variant font-label">{label}</span>
          </div>
        ))}
      </div>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !file && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center min-h-[300px] rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer mb-6 ${
          dragging
            ? 'border-primary bg-primary/8 scale-[1.01]'
            : 'border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container/50'
        } ${file ? 'cursor-default' : ''}`}
      >
        {!file && (
          <>
            <div className="absolute inset-0 rounded-2xl overflow-hidden">
              <div className={`absolute -bottom-20 -right-20 w-64 h-64 rounded-full bg-primary-dim/10 blur-3xl ${
                dragging ? 'animate-pulse' : 'animate-[pulse_3s_ease-in-out_infinite]'
              }`} />
            </div>
            <UploadIcon size={40} className={`mb-4 transition-all duration-300 ${dragging ? 'text-primary scale-110' : 'text-on-surface-variant'}`} />
            <p className="font-headline font-semibold text-on-surface mb-1">
              {dragging ? 'Drop to upload' : 'Drag & drop your file here'}
            </p>
            <p className="text-sm text-on-surface-variant">or click to browse</p>
            <p className="text-xs text-on-surface-variant/60 mt-4 font-label">Optional file attachment, max size 100MB</p>
          </>
        )}

        {file && uploadState === STATES.idle && (
          <div className="flex flex-col items-center gap-4 px-6 text-center w-full">
            <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
              <FileText size={28} className="text-primary" />
            </div>
            <div>
              <p className="font-semibold text-on-surface mb-1 break-all">{file.name}</p>
              <p className="text-sm text-on-surface-variant">{fileSize(file.size)}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
              }}
              className="text-on-surface-variant hover:text-error transition-colors duration-200"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {uploadState === STATES.uploading && (
          <div className="flex flex-col items-center gap-5 px-8 w-full">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                <Loader size={28} className="text-primary animate-spin" />
              </div>
            </div>
            <p className="font-semibold text-on-surface">Saving submission - {progress}%</p>
            <div className="w-full max-w-xs h-1.5 rounded-full bg-surface-high overflow-hidden">
              <div className="h-full rounded-full bg-primary-gradient transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {uploadState === STATES.success && (
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-tertiary/15 flex items-center justify-center">
              <CheckCircle size={32} className="text-tertiary" />
            </div>
            <p className="font-headline font-semibold text-on-surface">Upload complete!</p>
            <Badge variant="tertiary">Ready for interview</Badge>
          </div>
        )}

        <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
      </div>

      {error && <p className="text-sm text-error mb-4">{error}</p>}

      <div className="flex justify-between items-center">
        <div className="text-sm text-on-surface-variant">
          {file && uploadState === STATES.idle && <span>{file.name} selected</span>}
        </div>
        <div className="flex gap-3">
          {file && uploadState === STATES.idle && (
            <Button variant="secondary" onClick={() => setFile(null)}>Clear</Button>
          )}
          {uploadState === STATES.success ? (
            <Button variant="primary" onClick={() => navigate('/interview')} className="gap-2">
              Start Interview
              <ArrowRight size={16} />
            </Button>
          ) : (
            <Button variant="primary" onClick={handleUpload} disabled={uploadState === STATES.uploading} className="gap-2">
              {uploadState === STATES.uploading ? 'Saving...' : 'Upload & Continue'}
              <ArrowRight size={16} />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
