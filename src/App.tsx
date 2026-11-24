import { useEffect, useState } from 'react';
import { AdminDashboard } from './components/AdminDashboard';
import { CommercialChat } from './components/CommercialChat';
import { DemoMenuPreview } from './components/DemoMenuPreview';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  DEFAULT_FLOW_STEPS,
  DEFAULT_MENU_EXAMPLES,
  DEFAULT_SETTINGS,
} from './data/defaultData';
import {
  subscribeFlowSteps,
  subscribeMenuExamples,
  subscribePublicSettings,
} from './services/firestoreService';
import { AppSettings, FlowStep, MenuExample } from './types/vitrinehub';

function AppContent() {
  const [pathname, setPathname] = useState<string>(() =>
    typeof window !== 'undefined' ? window.location.pathname : '/'
  );

  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [steps, setSteps] = useState<FlowStep[]>(DEFAULT_FLOW_STEPS);
  const [examples, setExamples] = useState<MenuExample[]>(DEFAULT_MENU_EXAMPLES);

  const [dbHasSettings, setDbHasSettings] = useState(false);
  const [dbHasSteps, setDbHasSteps] = useState(false);
  const [dbHasExamples, setDbHasExamples] = useState(false);

  useEffect(() => {
    const onPopState = () => setPathname(window.location.pathname);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const unsubSettings = subscribePublicSettings((data, existsInDb) => {
      setSettings(data);
      setDbHasSettings(existsInDb);
    });
    const unsubSteps = subscribeFlowSteps((data, existsInDb) => {
      setSteps(data);
      setDbHasSteps(existsInDb);
    });
    const unsubExamples = subscribeMenuExamples((data, existsInDb) => {
      setExamples(data);
      setDbHasExamples(existsInDb);
    });

    return () => {
      unsubSettings();
      unsubSteps();
      unsubExamples();
    };
  }, []);

  const navigate = (to: string) => {
    if (window.location.pathname !== to) {
      window.history.pushState({}, '', to);
      setPathname(to);
    }
  };

  if (pathname.startsWith('/demo/')) {
    const slug = pathname.replace('/demo/', '').split('/')[0] || 'stackhouse-burger';
    return <DemoMenuPreview slug={slug} />;
  }

  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return (
      <AdminDashboard
        settings={settings}
        steps={steps}
        examples={examples}
        dbHasSettings={dbHasSettings}
        dbHasSteps={dbHasSteps}
        dbHasExamples={dbHasExamples}
        onBackToChat={() => navigate('/')}
      />
    );
  }

  return (
    <CommercialChat
      settings={settings}
      steps={steps}
      examples={examples}
      onOpenAdmin={() => navigate('/admin')}
    />
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppContent />
    </ErrorBoundary>
  );
}
