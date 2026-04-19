import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useTheme } from './lib/useTheme';
import Layout from './components/Layout';

import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Interview from './pages/Interview';
import Summary from './pages/Summary';
import Account from './pages/Account';

export default function App() {
  const { theme, toggle } = useTheme();

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout theme={theme} toggle={toggle} />}>
          <Route index element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/interview" element={<Interview />} />
          <Route path="/summary" element={<Summary />} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
