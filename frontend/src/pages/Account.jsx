import { useEffect, useMemo, useState } from 'react';
import { User, Shield, Key, Bell, Download, Trash2, Save, Check } from 'lucide-react';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { useAuth } from '../context/AuthContext';

const sidebarItems = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'data', label: 'Data & Privacy', icon: Key },
];

export default function Account() {
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    organization: '',
    bio: '',
  });

  useEffect(() => {
    const fullName = user?.name || '';
    const [firstName = '', ...rest] = fullName.split(' ');
    setProfile({
      firstName,
      lastName: rest.join(' '),
      email: user?.email || '',
      organization: user?.role === 'ADMIN' ? 'FeedbackAI Admin Team' : 'FeedbackAI User Workspace',
      bio: user?.role === 'ADMIN'
        ? 'Admin account for reviewing stored summaries and exports.'
        : 'User account for submitting generated outputs and participating in feedback interviews.',
    });
  }, [user]);

  const recentActivity = useMemo(() => [
    { action: `Signed in as ${user?.role || 'USER'}`, time: 'Current session', type: 'success' },
    { action: 'Backend-connected account view enabled', time: 'Today', type: 'primary' },
    { action: 'Session summaries are stored without raw transcripts', time: 'Privacy setting', type: 'muted' },
  ], [user?.role]);

  const handleChange = (field) => (e) => {
    setProfile(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-6 py-10 max-w-6xl mx-auto">
      <div className="mb-10">
        <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-1">Settings</p>
        <h1 className="font-headline font-bold text-3xl text-on-surface">My Account</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="md:col-span-1">
          <Card level="default" className="mb-4 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-primary-gradient flex items-center justify-center font-headline font-bold text-2xl text-on-primary mb-3 shadow-[0_0_30px_-8px] shadow-primary-dim/60">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <p className="font-headline font-semibold text-on-surface">{user?.name || 'Unknown User'}</p>
            <p className="text-xs text-on-surface-variant mt-0.5 mb-3">{user?.email || 'No email available'}</p>
            <Badge variant={user?.role === 'ADMIN' ? 'primary' : 'tertiary'} className="text-xs">
              {user?.role === 'ADMIN' ? 'Admin Account' : 'User Account'}
            </Badge>
          </Card>

          <nav className="flex flex-col gap-1">
            {sidebarItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-label font-medium transition-all duration-200 text-left ${
                  activeTab === id ? 'bg-primary/15 text-primary' : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        <div className="md:col-span-3 flex flex-col gap-5">
          {activeTab === 'profile' && (
            <>
              <Card level="default">
                <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-6">Personal Information</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <Input id="first-name" label="First Name" value={profile.firstName} onChange={handleChange('firstName')} />
                  <Input id="last-name" label="Last Name" value={profile.lastName} onChange={handleChange('lastName')} />
                  <Input id="email-acc" label="Email Address" type="email" value={profile.email} onChange={handleChange('email')} />
                  <Input id="org" label="Organization" value={profile.organization} onChange={handleChange('organization')} />
                  <div className="md:col-span-2">
                    <Input id="bio" label="Bio" value={profile.bio} onChange={handleChange('bio')} />
                  </div>
                </div>
                <div className="mt-8 flex justify-end">
                  <Button variant="primary" onClick={handleSave} className="gap-2">
                    {saved ? <><Check size={15} /> Saved!</> : <><Save size={15} /> Save Changes</>}
                  </Button>
                </div>
              </Card>

              <Card level="default">
                <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-5">Recent Activity</p>
                <div className="flex flex-col gap-0">
                  {recentActivity.map(({ action, time, type }, i) => (
                    <div key={i} className={`flex items-center justify-between py-3.5 ${i < recentActivity.length - 1 ? 'border-b border-outline-variant/10' : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${type === 'success' ? 'bg-tertiary' : type === 'primary' ? 'bg-primary' : 'bg-surface-high'}`} />
                        <span className="text-sm text-on-surface">{action}</span>
                      </div>
                      <span className="text-xs text-on-surface-variant font-label shrink-0 ml-4">{time}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}

          {activeTab === 'security' && (
            <Card level="default">
              <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-6">Security Settings</p>
              <div className="flex flex-col gap-8">
                <div>
                  <p className="text-sm font-semibold text-on-surface mb-5">Account Security</p>
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    Password reset and two-factor management are not wired yet, but this account is already backed by the shared auth system and JWT-based login flow.
                  </p>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'notifications' && (
            <Card level="default">
              <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-6">Notification Preferences</p>
              <div className="flex flex-col gap-0">
                {[
                  { label: 'Session Completed', desc: 'Notify when a feedback session finishes', on: true },
                  { label: 'Summary Stored', desc: 'Notify when the final summary is available', on: true },
                  { label: 'Admin Follow-Up', desc: 'When an admin adds notes later', on: false },
                ].map(({ label, desc, on }, i, arr) => (
                  <div key={label} className={`flex items-center justify-between py-5 ${i < arr.length - 1 ? 'border-b border-outline-variant/10' : ''}`}>
                    <div>
                      <p className="text-sm font-semibold text-on-surface">{label}</p>
                      <p className="text-xs text-on-surface-variant mt-0.5">{desc}</p>
                    </div>
                    <div className={`relative w-11 h-6 rounded-full transition-colors duration-300 flex items-center ${on ? 'bg-primary' : 'bg-surface-high'}`}>
                      <div className={`absolute w-4 h-4 rounded-full bg-white shadow transition-all duration-300 ${on ? 'right-1' : 'left-1'}`} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === 'data' && (
            <Card level="default">
              <p className="text-xs font-label uppercase tracking-widest text-on-surface-variant mb-6">Data & Privacy</p>
              <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between p-5 rounded-xl bg-surface-low">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">Stored Data Policy</p>
                    <p className="text-xs text-on-surface-variant mt-1">The system stores the session summary and structured insights, not the full conversation transcript.</p>
                  </div>
                  <Button variant="secondary" className="gap-2 py-2">
                    <Download size={14} />
                    Review
                  </Button>
                </div>
                <div className="flex items-center justify-between p-5 rounded-xl bg-error/5">
                  <div>
                    <p className="text-sm font-semibold text-error">Delete Account</p>
                    <p className="text-xs text-on-surface-variant mt-1">Account deletion is not connected yet.</p>
                  </div>
                  <Button variant="danger" className="gap-2 py-2">
                    <Trash2 size={14} />
                    Delete
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
