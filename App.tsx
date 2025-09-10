import React, { useState, useEffect } from 'react';
import type { KollelDetails, StipendSettings } from './types';
import Login from './components/Login';
import KollelSetup from './components/KollelSetup';
import Dashboard from './components/Dashboard';
import KollelSelection from './components/KollelSelection';

type AppState = 'LOGIN' | 'SELECT_KOLLEL' | 'SETUP_KOLLEL' | 'DASHBOARD';

const defaultSettings: StipendSettings = {
  baseStipend: 2000,
  deductionPerHour: 25,
  dailyHoursTarget: 7,
  sederA_start: '09:00',
  sederA_end: '13:00',
  sederB_start: '16:00',
  sederB_end: '19:00',
  testBonus: 0,
  summaryBonus: 0,
};

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>('LOGIN');
  const [kollels, setKollels] = useState<KollelDetails[]>(() => {
    try {
      const savedKollels = localStorage.getItem('kollelsList');
      return savedKollels ? JSON.parse(savedKollels) : [];
    } catch (error) {
      console.error("Failed to parse kollels list from localStorage", error);
      return [];
    }
  });
  const [selectedKollel, setSelectedKollel] = useState<KollelDetails | null>(null);
  const [editingKollel, setEditingKollel] = useState<KollelDetails | null>(null);

  useEffect(() => {
    localStorage.setItem('kollelsList', JSON.stringify(kollels));
  }, [kollels]);

  const handleLogin = () => {
    if (kollels.length > 0) {
      setAppState('SELECT_KOLLEL');
    } else {
      setAppState('SETUP_KOLLEL');
    }
  };

  const handleLogout = () => {
    setSelectedKollel(null);
    setEditingKollel(null);
    setAppState('LOGIN');
  };

  const handleSelectKollel = (kollelId: string) => {
    const kollel = kollels.find(k => k.id === kollelId);
    if (kollel) {
      setSelectedKollel(kollel);
      setAppState('DASHBOARD');
    }
  };

  const handleDeleteKollel = (kollelId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את הכולל? לא ניתן לשחזר פעולה זו.')) {
        setKollels(kollels.filter(k => k.id !== kollelId));
    }
  };

  const handleGoToSetup = () => {
    setEditingKollel(null); // Ensure we are in "add new" mode
    setAppState('SETUP_KOLLEL');
  };

  const handleStartEdit = (kollelId: string) => {
    const kollelToEdit = kollels.find(k => k.id === kollelId);
    if (kollelToEdit) {
      setEditingKollel(kollelToEdit);
      setAppState('SETUP_KOLLEL');
    }
  };
  
  const handleSetupComplete = (kollelData: { name: string; managerName?: string; phone?: string; address?: string; }) => {
    if (editingKollel) { // We are in edit mode
      const updatedKollels = kollels.map(k => 
        k.id === editingKollel.id ? { ...k, ...kollelData } : k
      );
      setKollels(updatedKollels);
      // If the edited kollel is the selected one, update it
      if (selectedKollel && selectedKollel.id === editingKollel.id) {
          setSelectedKollel(prev => prev ? { ...prev, ...kollelData } : null);
      }
      setAppState('SELECT_KOLLEL');
    } else { // We are in add new mode
      const newKollel: KollelDetails = {
          id: Date.now().toString(),
          ...kollelData,
          settings: defaultSettings,
      };
      setKollels([...kollels, newKollel]);
      setSelectedKollel(newKollel);
      setAppState('DASHBOARD');
    }
    setEditingKollel(null);
  };

  const handleUpdateKollelSettings = (newSettings: StipendSettings) => {
    if (!selectedKollel) return;

    const updatedKollel = { ...selectedKollel, settings: newSettings };

    const updatedKollels = kollels.map(k => 
      k.id === selectedKollel.id ? updatedKollel : k
    );

    setKollels(updatedKollels);
    setSelectedKollel(updatedKollel);
  };
  
  const handleCancelSetup = () => {
      setEditingKollel(null);
      if(kollels.length > 0) {
          setAppState('SELECT_KOLLEL');
      } else {
        setAppState('LOGIN');
      }
  };

  const handleSwitchKollel = () => {
    setSelectedKollel(null);
    setEditingKollel(null);
    setAppState('SELECT_KOLLEL');
  };

  const renderContent = () => {
    switch (appState) {
      case 'LOGIN':
        return <Login onLogin={handleLogin} />;
      case 'SELECT_KOLLEL':
        return <KollelSelection kollels={kollels} onSelect={handleSelectKollel} onAdd={handleGoToSetup} onDelete={handleDeleteKollel} onEdit={handleStartEdit} />;
      case 'SETUP_KOLLEL':
        return <KollelSetup 
            onSetupComplete={handleSetupComplete} 
            onCancel={handleCancelSetup} 
            existingKollel={editingKollel}
        />;
      case 'DASHBOARD':
        if (!selectedKollel) {
          setAppState('SELECT_KOLLEL');
          return null; 
        }
        return <Dashboard 
            kollelDetails={selectedKollel} 
            onLogout={handleLogout} 
            onSwitchKollel={handleSwitchKollel}
            onUpdateSettings={handleUpdateKollelSettings}
        />;
      default:
        return <Login onLogin={handleLogin} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
        {renderContent()}
    </div>
  );
};

export default App;