import { AppProvider, useApp } from './context/AppContext';
import Navbar from './components/Navbar';
import ManualModal from './components/ManualModal';
import GanttView from './views/GanttView';
import ProjectsView from './views/ProjectsView';

function AppShell() {
  const { activeView } = useApp();

  return (
    <div className="h-screen flex flex-col bg-industrial-900 overflow-hidden">
      <Navbar />
      <ManualModal />
      <main className="flex-1 min-h-0 overflow-hidden">
        {activeView === 'gantt'    && <GanttView />}
        {activeView === 'projects' && <ProjectsView />}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
