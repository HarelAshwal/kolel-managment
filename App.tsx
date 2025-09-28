import React, { useState, useEffect } from 'react';
import type { KollelDetails, StipendSettings } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Header from './components/Header';
import KollelSetup from './components/KollelSetup';
import Dashboard from './components/Dashboard';
import KollelSelection from './components/KollelSelection';
import SuperAdminPanel from './components/SuperAdminPanel';
import VersionDisplay from './components/VersionDisplay';
import { getKollels, getAllKollelsForAdmin, addKollel, updateKollel, deleteKollel } from './services/api';

type AppState = 'SELECT_KOLLEL' | 'SETUP_KOLLEL' | 'DASHBOARD' | 'SUPER_ADMIN';

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
  const { isAuthenticated, isLoading, user } = useAuth();
  const [appState, setAppState] = useState<AppState>('SELECT_KOLLEL');
  const [kollels, setKollels] = useState<KollelDetails[]>([]);
  const [selectedKollel, setSelectedKollel] = useState<KollelDetails | null>(null);
  const [editingKollel, setEditingKollel] = useState<KollelDetails | null>(null);
  const [isKollelsLoading, setIsKollelsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated && !isLoading && user) {
      loadKollels();
    }
  }, [isAuthenticated, isLoading, user?.isSuperAdmin]);

  // Effect to reset state on logout
  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedKollel(null);
      setEditingKollel(null);
      setKollels([]);
      setAppState('SELECT_KOLLEL');
    }
  }, [isAuthenticated]);

  const loadKollels = async () => {
    try {
      setError(null);
      setIsKollelsLoading(true);

      // Use admin API if user is super admin, otherwise use regular API
      const data = user?.isSuperAdmin
        ? await getAllKollelsForAdmin()
        : await getKollels();

      console.log('🔧 Loaded kollels:', data.length, 'kollels for user:', user?.email, 'isSuperAdmin:', user?.isSuperAdmin);
      setKollels(data);

      // If no kollels exist, go to setup (only for non-admin users)
      if (data.length === 0 && !user?.isSuperAdmin) {
        setAppState('SETUP_KOLLEL');
      }
    } catch (err) {
      console.error("Failed to load kollels", err);
      setError("שגיאה בטעינת הנתונים. נסה לרענן את הדף.");
    } finally {
      setIsKollelsLoading(false);
    }
  };

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
        // Fix: Corrected typo from `selectedKolel` to `selectedKollel`.
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

  const handleShowSuperAdmin = () => {
    setAppState('SUPER_ADMIN');
  };

  const handleSelectKollelFromAdmin = (kollel: KollelDetails) => {
    setSelectedKollel(kollel);
    setAppState('DASHBOARD');
  };

  const renderContent = () => {
    if (isLoading) {
      return <div className="text-center text-lg animate-pulse">טוען...</div>;
    }

    if (!isAuthenticated) {
      return <Login />;
    }

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
          onSwitchKollel={handleSwitchKollel}
          onUpdateSettings={handleUpdateKollelSettings}
        />;
      case 'SUPER_ADMIN':
        return (
          <div>
            <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
              <button
                onClick={() => setAppState('SELECT_KOLLEL')}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                ← חזור לכוללים שלי
              </button>
            </div>
            <SuperAdminPanel onSelectKollel={handleSelectKollelFromAdmin} />
          </div>
        );
      default:
        return <KollelSelection
          kollels={kollels}
          onSelect={handleSelectKollel}
          onAdd={handleGoToSetup}
          onDelete={handleDeleteKollel}
          onEdit={handleStartEdit}
          isSuperAdmin={user?.isSuperAdmin}
        />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <Header onShowSuperAdmin={user?.isSuperAdmin ? handleShowSuperAdmin : undefined} />
      <main className="flex flex-col items-center justify-center p-4">
        {renderContent()}
      </main>
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