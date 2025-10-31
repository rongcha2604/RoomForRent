
import React, { useState, useEffect } from 'react';
import { AppProvider } from './hooks/useAppData';
import DashboardView from './views/DashboardView';
import RoomsView from './views/RoomsView';
import InvoicesView from './views/InvoicesView';
import TenantsView from './views/TenantsView';
import SettingsView from './views/SettingsView';
import ReportsView from './views/ReportsView';
import BottomNavBar from './components/BottomNavBar';
import AddReadingModal from './components/modals/AddReadingModal';
import AddTenantModal from './components/modals/AddTenantModal';
import AddMaintenanceModal from './components/modals/AddMaintenanceModal';
import GenerateInvoicesModal from './components/modals/GenerateInvoicesModal';
import AddLeaseModal from './components/modals/AddLeaseModal';
import SetupSecurityModal from './components/modals/SetupSecurityModal';
import VerifyPasswordModal from './components/modals/VerifyPasswordModal';
import { type ModalType, type View } from './types';
import { localDb } from './services/localStorageDb';
// Import cleanup utilities (exposes cleanup functions to console)
import './services/cleanupDuplicates';
import './services/cleanupDuplicateInvoices';
import './services/cleanupDuplicateExpenses';

const AppContent: React.FC = () => {
    const [activeView, setActiveView] = useState<View>('dashboard');
    const [activeModal, setActiveModal] = useState<ModalType | null>(null);
    const [verifyCallback, setVerifyCallback] = useState<(() => void) | null>(null);

    // Check if security is set up on first load
    useEffect(() => {
        const checkSecurity = async () => {
            const security = await localDb.getSecuritySettings();
            if (!security || !security.isSetup) {
                setActiveModal('setupSecurity');
            }
        };
        checkSecurity();
    }, []);

    const renderView = () => {
        switch (activeView) {
            case 'dashboard':
                return <DashboardView setActiveView={setActiveView} setActiveModal={setActiveModal} currentView="dashboard" />;
            case 'rooms':
                return <RoomsView setActiveView={setActiveView} currentView="rooms" />;
            case 'invoices':
                return <InvoicesView setActiveModal={setActiveModal} setActiveView={setActiveView} currentView="invoices" />;
            case 'tenants':
                return <TenantsView setActiveView={setActiveView} currentView="tenants" />;
            case 'settings':
                return <SettingsView 
                    setActiveView={setActiveView} 
                    currentView="settings"
                    requestPasswordVerification={(callback: () => void) => {
                        setVerifyCallback(() => callback);
                        setActiveModal('verifyPassword');
                    }}
                />;
            case 'reports':
                return <ReportsView setActiveView={setActiveView} currentView="reports" />;
            default:
                return <DashboardView setActiveView={setActiveView} setActiveModal={setActiveModal} currentView="dashboard" />;
        }
    };

    const renderModal = () => {
        switch (activeModal) {
            case 'addReading':
                return <AddReadingModal onClose={() => setActiveModal(null)} />;
            case 'addTenant':
                return <AddTenantModal onClose={() => setActiveModal(null)} />;
            case 'addMaintenance':
                return <AddMaintenanceModal onClose={() => setActiveModal(null)} />;
            case 'generateInvoices':
                return <GenerateInvoicesModal onClose={() => setActiveModal(null)} />;
            case 'addLease':
                return <AddLeaseModal onClose={() => setActiveModal(null)} />;
            case 'setupSecurity':
                return <SetupSecurityModal 
                    onComplete={() => setActiveModal(null)} 
                    onNavigateToSettings={() => setActiveView('settings')}
                />;
            case 'verifyPassword':
                return verifyCallback ? (
                    <VerifyPasswordModal
                        onClose={() => {
                            setActiveModal(null);
                            setVerifyCallback(null);
                        }}
                        onVerified={() => {
                            if (verifyCallback) verifyCallback();
                            setVerifyCallback(null);
                        }}
                    />
                ) : null;
            default:
                return null;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800">
            <main className="pb-24 max-w-lg mx-auto bg-white min-h-screen shadow-lg">
                {renderView()}
            </main>
            {renderModal()}
            <BottomNavBar setActiveModal={setActiveModal} setActiveView={setActiveView} currentView={activeView} />
        </div>
    );
};


const App: React.FC = () => {
    return (
        <AppProvider>
            <AppContent />
        </AppProvider>
    );
};


export default App;
