import React, { useState, useEffect } from 'react';
import type { KollelDetails, StipendSettings } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import KollelSetup from './components/KollelSetup';
import Dashboard from './components/Dashboard';
import KollelSelection from './components/KollelSelection';
import VersionDisplay from './components/VersionDisplay';
import { getKollels, addKollel, updateKollel, deleteKollel } from './services/api';

type AppState = 'SELECT_KOLLEL' | 'SETUP_KOLLEL' | 'DASHBOARD';

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

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const [appState, setAppState] = useState<AppState>('SELECT_KOLLEL');
  const [kollels, setKollels] = useState<KollelDetails[]>([]);
  const [selectedKollel, setSelectedKollel] = useState<KollelDetails | null>(null);
  const [editingKollel, setEditingKollel] = useState<KollelDetails | null>(null);
  const [isKollelsLoading, setIsKollelsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      loadKollels();
    }
  }, [isAuthenticated, isLoading]);

  const loadKollels = async () => {
    try {
      setError(null);
      setIsKollelsLoading(true);
      const data = await getKollels();
      setKollels(data);

      // If no kollels exist, go to setup
      if (data.length === 0) {
        setAppState('SETUP_KOLLEL');
      }
    } catch (err) {
      console.error("Failed to load kollels", err);
      setError("שגיאה בטעינת הנתונים. נסה לרענן את הדף.");
    } finally {
      setIsKollelsLoading(false);
    }
  };

  // Show loading screen while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center text-lg animate-pulse">טוען...</div>
        <VersionDisplay />
      </div>
    );
  }

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Login />
        <VersionDisplay />
      </div>
    );
  }

  const handleSelectKollel = (kollelId: string) => {
    const kollel = kollels.find(k => k.id === kollelId);
    if (kollel) {
      setSelectedKollel(kollel);
      setAppState('DASHBOARD');
    }
  };

  const handleDeleteKollel = async (kollelId: string) => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את הכולל? לא ניתן לשחזר פעולה זו.')) {
      try {
        await deleteKollel(kollelId);
        setKollels(prev => prev.filter(k => k.id !== kollelId));
      } catch (err) {
        console.error("Failed to delete kollel", err);
        alert("שגיאה במחיקת הכולל.");
      }
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

  const handleSetupComplete = async (kollelData: { name: string; managerName?: string; phone?: string; address?: string; }) => {
    try {
      if (editingKollel) { // We are in edit mode
        const kollelToUpdate = { ...editingKollel, ...kollelData };
        const updatedKollel = await updateKollel(kollelToUpdate);

        setKollels(prev => prev.map(k =>
          k.id === editingKollel.id ? updatedKollel : k
        ));

        // If the edited kollel is the selected one, update it
        if (selectedKollel && selectedKollel.id === editingKollel.id) {
          setSelectedKollel(updatedKollel);
        }
        setAppState('SELECT_KOLLEL');
      } else { // We are in add new mode
        const newKollelData = {
          ...kollelData,
          settings: defaultSettings,
        };
        const newKollel = await addKollel(newKollelData);
        setKollels(prev => [...prev, newKollel]);
        setSelectedKollel(newKollel);
        setAppState('DASHBOARD');
      }
      setEditingKollel(null);
    } catch (err) {
      console.error("Failed to save kollel", err);
      alert("שגיאה בשמירת פרטי הכולל.");
    }
  };

  const handleUpdateKollelSettings = async (newSettings: StipendSettings) => {
    if (!selectedKollel) {
      console.error('❌ No kollel selected');
      return;
    }

    if (!selectedKollel.id || selectedKollel.id === 'undefined') {
      console.error('❌ Invalid kollel ID:', selectedKollel.id);
      alert("שגיאה: זיהוי הכולל לא תקין");
      return;
    }

    console.log('🔄 Updating kollel settings for kollel:', selectedKollel.id);
    console.log('📊 New settings:', newSettings);

    try {
      const updatedKollelData = { ...selectedKollel, settings: newSettings };
      console.log('📤 Sending update request with data:', updatedKollelData);

      const updatedKollel = await updateKollel(updatedKollelData);

      setKollels(prev => prev.map(k =>
        k.id === selectedKollel.id ? updatedKollel : k
      ));
      setSelectedKollel(updatedKollel);
      console.log('✅ Successfully updated kollel settings');
    } catch (err) {
      console.error("❌ Failed to update settings", err);
      alert("שגיאה בעדכון הגדרות המלגה.");
    }
  };

  const handleCancelSetup = () => {
    setEditingKollel(null);
    if (kollels.length > 0) {
      setAppState('SELECT_KOLLEL');
    }
    // Don't go back to LOGIN since we're authenticated
  };

  const handleSwitchKollel = () => {
    setSelectedKollel(null);
    setEditingKollel(null);
    setAppState('SELECT_KOLLEL');
  };

  const handleLogout = () => {
    logout();
    setSelectedKollel(null);
    setEditingKollel(null);
  };

  const renderContent = () => {
    if (isKollelsLoading) {
      return <div className="text-center text-lg animate-pulse">טוען נתונים...</div>;
    }
    if (error) {
      return <div className="text-center text-red-500 bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">{error}</div>;
    }

    switch (appState) {
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
        return <KollelSelection kollels={kollels} onSelect={handleSelectKollel} onAdd={handleGoToSetup} onDelete={handleDeleteKollel} onEdit={handleStartEdit} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {renderContent()}
      <VersionDisplay />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;