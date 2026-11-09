import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { isConfigured } from './lib/supabase';
import { AuthProvider, useSession } from './lib/auth';
import Layout from './components/Layout';
import Login, { ResetPassword, SetupNeeded } from './pages/Login';
import NewContract, { ContractHistory } from './pages/Contracts';
import ContractEditor from './pages/ContractEditor';
import Cvs, { CvEditor } from './pages/Cvs';
import { Spinner } from './components/ui';
import DevTemplates from './pages/DevTemplates';
import DevCv from './pages/DevCv';

// the template editor brings react-dom/server; load it only when opened
const TemplateEditor = lazy(() => import('./pages/TemplateEditor'));
const ImportContract = lazy(() => import('./pages/ImportContract'));
const DevRoundtrip = lazy(() => import('./pages/DevRoundtrip'));

function Routed() {
  const session = useSession();
  if (session === undefined) return <Spinner />;
  if (location.pathname === '/reset-password') return <ResetPassword />;
  if (!session) return <Login />;
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Navigate to="/contracts" replace />} />
        <Route path="contracts" element={<NewContract />} />
        <Route path="contracts/history" element={<ContractHistory />} />
        <Route path="contracts/import" element={<Suspense fallback={<Spinner />}><ImportContract /></Suspense>} />
        <Route path="cvs" element={<Cvs />} />
        <Route path="contracts/new/:templateId" element={<ContractEditor />} />
        <Route path="contracts/:id" element={<ContractEditor />} />
        <Route path="contracts/templates/:id/edit" element={<Suspense fallback={<Spinner />}><TemplateEditor /></Suspense>} />
        <Route path="cvs/new" element={<CvEditor />} />
        <Route path="cvs/:id" element={<CvEditor />} />
      </Route>
      <Route path="*" element={<Navigate to="/contracts" replace />} />
    </Routes>
  );
}

export default function App() {
  // development-only page to check every template against its Word original
  if (import.meta.env.DEV && location.pathname === '/dev/templates') return <DevTemplates />;
  if (import.meta.env.DEV && location.pathname === '/dev/cv') return <DevCv />;
  if (import.meta.env.DEV && location.pathname === '/dev/roundtrip') return <Suspense fallback={null}><DevRoundtrip /></Suspense>;
  if (!isConfigured) return <SetupNeeded />;
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routed />
      </AuthProvider>
    </BrowserRouter>
  );
}
