import { Link } from 'react-router-dom';
import { ArrowRight, Sparkles, Brain, BarChart3, Upload, MessageSquare, TrendingUp, ShieldCheck, RefreshCw } from 'lucide-react';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Card from '../components/ui/Card';

const stats = [
  { value: '94%', label: 'Evaluation Coverage', color: 'text-primary' },
  { value: '12K+', label: 'Model Outputs Reviewed', color: 'text-tertiary' },
  { value: '3.1x', label: 'Faster Iteration Cycles', color: 'text-secondary' },
  { value: '5-Star', label: 'Structured Session Quality', color: 'text-primary' },
];

const features = [
  {
    icon: Upload,
    title: 'Multi-Format Model Output Ingestion',
    desc: 'Submit model outputs in any format — PDF reports, audio transcripts, video demos, or raw code — and let the pipeline parse them automatically.',
  },
  {
    icon: Brain,
    title: 'Conversational Evaluation Sessions',
    desc: 'Each output goes through a structured AI-guided interview that probes quality, coherence, accuracy, and potential improvements across 5 targeted questions.',
  },
  {
    icon: BarChart3,
    title: 'Centralized Admin Analytics',
    desc: 'A real-time dashboard aggregates evaluation data across all sessions — surfacing quality trends, weak points, and improvement signals at a glance.',
  },
  {
    icon: RefreshCw,
    title: 'Closed-Loop Model Improvement',
    desc: 'Feedback is synthesized into structured insight reports that feed directly into your model refinement and fine-tuning decision workflows.',
  },
];

const workflow = [
  {
    step: '01',
    icon: Upload,
    title: 'Submit a Model Output',
    desc: 'Upload the specific output you want evaluated — a generated document, audio response, code snippet, or any other artifact.',
  },
  {
    step: '02',
    icon: MessageSquare,
    title: 'AI Conducts the Interview',
    desc: 'Our system runs an adaptive 5-question evaluation session to collect structured, in-depth quality feedback on the submission.',
  },
  {
    step: '03',
    icon: BarChart3,
    title: 'Insights Flow to the Dashboard',
    desc: 'Every session is automatically synthesised into scored insights, surfaced in the admin console for review and tracking.',
  },
  {
    step: '04',
    icon: TrendingUp,
    title: 'Improve the Model',
    desc: 'Take the structured reports into your fine-tuning or prompt engineering cycle — closing the loop from evaluation to improvement.',
  },
];

const benefits = [
  { icon: ShieldCheck, label: 'Consistent evaluation criteria across every session' },
  { icon: Brain, label: 'AI-generated quality scores tied to real responses' },
  { icon: BarChart3, label: 'Version-level tracking across model iterations' },
  { icon: RefreshCw, label: 'Exportable reports ready for engineering & research teams' },
  { icon: Sparkles, label: 'Structured insight chips that highlight priorities at a glance' },
  { icon: TrendingUp, label: 'Trend dashboards to measure progress across evaluation cycles' },
];



export default function Landing() {
  return (
    <div className="relative overflow-hidden">
      {/* Background orbs */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/8 blur-[120px]" />
        <div className="absolute top-1/2 -left-60 w-[500px] h-[500px] rounded-full bg-tertiary/6 blur-[100px]" />
        <div className="absolute bottom-0 right-1/3 w-[400px] h-[400px] rounded-full bg-secondary/6 blur-[100px]" />
      </div>

      {/* ── Hero ── */}
      <section className="min-h-[90vh] flex flex-col items-center justify-center text-center px-6 pt-20 pb-16">
        <div className="mb-6">
          <Badge variant="primary" className="px-4 py-1.5 text-xs uppercase tracking-widest">
            <Sparkles size={12} />
            Internal Model Evaluation Platform
          </Badge>
        </div>

        <h1 className="font-headline font-bold text-5xl md:text-7xl leading-[1.05] tracking-tight max-w-4xl mb-6">
          <span className="text-on-surface">Close the Loop on</span>
          <br />
          <span className="text-transparent bg-clip-text bg-primary-gradient">AI Model Feedback</span>
        </h1>

        <p className="text-on-surface-variant text-lg md:text-xl max-w-2xl leading-relaxed mb-10">
          A structured, conversational evaluation system that collects rich quality feedback on your model outputs —
          then transforms those responses into actionable intelligence to drive the next improvement cycle.
        </p>

        <div className="flex flex-wrap items-center gap-4 justify-center">
          <Link to="/upload">
            <Button variant="primary" className="px-8 py-4 text-base gap-2">
              Submit a Model Output
              <ArrowRight size={16} />
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button variant="secondary" className="px-8 py-4 text-base">
              View Evaluation Dashboard
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {stats.map(({ value, label, color }) => (
            <div key={label} className="flex flex-col items-center text-center p-6 rounded-xl bg-surface-container">
              <span className={`font-headline font-bold text-4xl ${color} mb-1`}>{value}</span>
              <span className="text-xs text-on-surface-variant uppercase tracking-widest font-label">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-20 px-6 bg-surface-low">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-label uppercase tracking-[0.2em] text-on-surface-variant mb-3">Workflow</p>
            <h2 className="font-headline font-bold text-4xl md:text-5xl text-on-surface tracking-tight">
              From output to insight in four steps
            </h2>
            <p className="text-on-surface-variant mt-4 max-w-xl mx-auto">
              A repeatable evaluation loop that gives your team consistent, structured quality signals — every single session.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {workflow.map(({ step, icon: Icon, title, desc }) => (
              <Card key={step} level="default" className="group hover:bg-surface-high transition-all duration-300 relative">
                <div className="absolute top-4 right-5 font-headline font-bold text-3xl text-primary/10 select-none">{step}</div>
                <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center mb-5
                                group-hover:bg-primary/25 group-hover:scale-110 transition-all duration-300">
                  <Icon size={20} className="text-primary" />
                </div>
                <h3 className="font-headline font-semibold text-base text-on-surface mb-2 leading-snug">{title}</h3>
                <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Platform Features ── */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-xs font-label uppercase tracking-[0.2em] text-on-surface-variant mb-3">Platform</p>
            <h2 className="font-headline font-bold text-4xl md:text-5xl text-on-surface tracking-tight">
              Built for systematic model evaluation
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <Card key={title} level="default" className="group hover:bg-surface-high transition-all duration-300 cursor-default">
                <div className="flex items-start gap-5">
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center shrink-0
                                  group-hover:bg-primary/25 group-hover:scale-110 transition-all duration-300">
                    <Icon size={22} className="text-primary" />
                  </div>
                  <div>
                    <h3 className="font-headline font-semibold text-lg text-on-surface mb-2">{title}</h3>
                    <p className="text-sm text-on-surface-variant leading-relaxed">{desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Benefits list ── */}
      <section className="py-20 px-6 bg-surface-low">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-label uppercase tracking-[0.2em] text-on-surface-variant mb-3">Why FeedbackAI</p>
            <h2 className="font-headline font-bold text-4xl text-on-surface tracking-tight mb-6">
              Structured feedback beats informal gut-checks
            </h2>
            <p className="text-on-surface-variant leading-relaxed">
              Ad-hoc impressions don't scale. FeedbackAI replaces informal, one-off evaluations with a 
              repeatable, AI-guided interview process — so every model output is measured against the same 
              structured criteria, every time.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {benefits.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-4 p-4 rounded-xl bg-surface-container">
                <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
                  <Icon size={16} className="text-primary" />
                </div>
                <p className="text-sm text-on-surface">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── CTA ── */}
      <section className="py-24 px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="font-headline font-bold text-4xl md:text-5xl text-on-surface tracking-tight mb-6">
            Start building better models<br />
            <span className="text-transparent bg-clip-text bg-primary-gradient">with every evaluation cycle.</span>
          </h2>
          <p className="text-on-surface-variant mb-10">
            Every session generates structured signals. Every signal helps you ship a better model.
          </p>
          <Link to="/upload">
            <Button variant="primary" className="px-10 py-4 text-base gap-2 mx-auto">
              Submit Your First Output
              <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
