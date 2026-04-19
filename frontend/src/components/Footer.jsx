import { Link } from 'react-router-dom';
import { Brain, Code2, MessageCircle, ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-outline-variant/10 mt-24 py-12 px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-primary-gradient flex items-center justify-center">
                <Brain size={14} className="text-on-primary" />
              </div>
              <span className="font-headline font-bold text-base text-on-surface">
                Feedback<span className="text-transparent bg-clip-text bg-primary-gradient">AI</span>
              </span>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed max-w-xs">
              Transforming how teams collect and analyze AI model feedback through conversational intelligence.
            </p>
          </div>
          <div>
            <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-4">Product</p>
            <div className="flex flex-col gap-2.5">
              {['Features', 'Pricing', 'Changelog', 'Docs'].map(item => (
                <Link key={item} to="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors duration-200">{item}</Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-4">Company</p>
            <div className="flex flex-col gap-2.5">
              {['About', 'Blog', 'Careers', 'Contact'].map(item => (
                <Link key={item} to="#" className="text-sm text-on-surface-variant hover:text-primary transition-colors duration-200">{item}</Link>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-outline-variant/10">
          <p className="text-xs text-on-surface-variant">© 2026 FeedbackAI. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {[Code2, MessageCircle, ExternalLink].map((Icon, i) => (
              <a key={i} href="#" className="text-on-surface-variant hover:text-primary transition-colors duration-200">
                <Icon size={16} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
