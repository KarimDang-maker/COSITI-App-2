import React, { Suspense, lazy, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './components/auth/LoginPage';
import { ChangePasswordPage } from './components/auth/ChangePasswordPage';
import { Notifications } from './components/Notifications';
import { setConfirmationCodePrompt, logEvent } from './api/client';
import { Loader2 } from 'lucide-react';
import { DialogProvider, useDialog } from './context/DialogContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
const DashboardView = lazy(() => import('./components/DashboardView').then((m) => ({ default: m.DashboardView })));
const AdherentsView = lazy(() => import('./components/AdherentsView').then((m) => ({ default: m.AdherentsView })));
const CotisationsView = lazy(() => import('./components/CotisationsView').then((m) => ({ default: m.CotisationsView })));
const ImmatriculationsView = lazy(() => import('./components/ImmatriculationsView').then((m) => ({ default: m.ImmatriculationsView })));
const DossiersView = lazy(() => import('./components/DossiersView').then((m) => ({ default: m.DossiersView })));
const AlertesView = lazy(() => import('./components/AlertesView').then((m) => ({ default: m.AlertesView })));
const RapportsView = lazy(() => import('./components/RapportsView').then((m) => ({ default: m.RapportsView })));
const EtatsMensuelsView = lazy(() => import('./components/EtatsMensuelsView').then((m) => ({ default: m.EtatsMensuelsView })));
const UtilisateursView = lazy(() => import('./components/UtilisateursView').then((m) => ({ default: m.UtilisateursView })));
const ParametresView = lazy(() => import('./components/ParametresView').then((m) => ({ default: m.ParametresView })));
const JournalView = lazy(() => import('./components/JournalView').then((m) => ({ default: m.JournalView })));
const DepensesView = lazy(() => import('./components/finance/DepensesView').then((m) => ({ default: m.DepensesView })));
const PaieView = lazy(() => import('./components/finance/PaieView').then((m) => ({ default: m.PaieView })));
const AgendaView = lazy(() => import('./components/direction/AgendaView').then((m) => ({ default: m.AgendaView })));
const GestionnairesView = lazy(() => import('./components/GestionnairesView').then((m) => ({ default: m.GestionnairesView })));
const RapportsReunionsView = lazy(() => import('./components/RapportsReunionsView').then((m) => ({ default: m.RapportsReunionsView })));
const RapportsAgentsCaisseView = lazy(() => import('./components/RapportsAgentsCaisseView').then((m) => ({ default: m.RapportsAgentsCaisseView })));

// Modals
import { PinConfirmModal } from './components/PinConfirmModal';
const ReceiptModal = lazy(() => import('./components/ReceiptModal').then((m) => ({ default: m.ReceiptModal })));
import { AdherentModal } from './components/AdherentModal';
import { CotisationModal } from './components/CotisationModal';
const AdherentDetailsModal = lazy(() => import('./components/AdherentDetailsModal').then((m) => ({ default: m.AdherentDetailsModal })));
import { ImmatriculationModal } from './components/ImmatriculationModal';
import { DossierAllocationsModal } from './components/DossierAllocationsModal';

import { Adherent, Cotisation, DossierAllocations } from './types';

const MainApp: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    adherents,
    cotisations,
    dossiers,
    deleteAdherent,
    deleteCotisation,
    parametres,
  } = useApp();
  const dialog = useDialog();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Modals States
  const [isAdherentModalOpen, setIsAdherentModalOpen] = useState(false);
  const [adherentToEdit, setAdherentToEdit] = useState<Adherent | null>(null);

  const [isCotisationModalOpen, setIsCotisationModalOpen] = useState(false);
  const [cotisationToEdit, setCotisationToEdit] = useState<Cotisation | null>(null);
  const [cotisationPreselectedAdherentId, setCotisationPreselectedAdherentId] = useState<
    string | null
  >(null);

  const [selectedAdherentId, setSelectedAdherentId] = useState<string | null>(null);
  const [isAdherentDetailsOpen, setIsAdherentDetailsOpen] = useState(false);

  const [selectedReceiptCotisation, setSelectedReceiptCotisation] =
    useState<Cotisation | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const [immatriculationTargetAdherent, setImmatriculationTargetAdherent] =
    useState<Adherent | null>(null);
  const [isImmatriculationModalOpen, setIsImmatriculationModalOpen] = useState(false);

  const [selectedDossier, setSelectedDossier] = useState<DossierAllocations | null>(null);
  const [isDossierModalOpen, setIsDossierModalOpen] = useState(false);

  // Sécurité PIN modal state
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinModalTitle, setPinModalTitle] = useState('');
  const [pinModalDesc, setPinModalDesc] = useState('');
  const [pendingPinAction, setPendingPinAction] = useState<((pin: string) => void) | null>(null);

  const requestPinConfirm = (action: (pin: string) => void, title: string, desc: string) => {
    setPendingPinAction(() => action);
    setPinModalTitle(title);
    setPinModalDesc(desc);
    setIsPinModalOpen(true);
  };

  const handlePinSuccess = (pin: string) => {
    if (pendingPinAction) {
      pendingPinAction(pin);
    }
    setIsPinModalOpen(false);
    setPendingPinAction(null);
  };

  // Actions transversales
  const handleOpenNewAdherent = () => {
    setAdherentToEdit(null);
    setIsAdherentModalOpen(true);
  };

  const handleEditAdherent = (adh: Adherent) => {
    setAdherentToEdit(adh);
    setIsAdherentModalOpen(true);
  };

  const handleDeleteAdherent = (adh: Adherent) => {
    requestPinConfirm(
      async (pin) => {
        const res = await deleteAdherent(adh.id, pin);
        if (res.success) {
          setIsAdherentDetailsOpen(false);
        } else {
          dialog.alert({
            title: 'Erreur de suppression',
            message: res.error || 'Impossible de supprimer cet adhérent.',
            variant: 'error',
          });
        }
      },
      'Suppression d\'adhérent (Code 0000)',
      `Êtes-vous certain de vouloir supprimer définitivement l'adhérent ${adh.matricule} (${adh.nom} ${adh.prenom}) ? Cette action est irréversible.`
    );
  };

  const handleOpenNewCotisation = (preselectedAdhId?: string) => {
    setCotisationToEdit(null);
    setCotisationPreselectedAdherentId(preselectedAdhId || null);
    setIsCotisationModalOpen(true);
  };

  const handleEditCotisation = (cot: Cotisation) => {
    setCotisationToEdit(cot);
    setIsCotisationModalOpen(true);
  };

  const handleDeleteCotisation = (cot: Cotisation) => {
    requestPinConfirm(
      async (pin) => {
        const res = await deleteCotisation(cot.id, pin);
        if (!res.success) {
          dialog.alert({
            title: 'Erreur de suppression',
            message: res.error || 'Impossible de supprimer cette cotisation.',
            variant: 'error',
          });
        }
      },
      'Suppression de versement (Code 0000)',
      `Voulez-vous supprimer le versement de ${cot.montant} FCFA enregistré pour ${cot.matricule} ?`
    );
  };

  const handleSelectAdherent = (id: string) => {
    setSelectedAdherentId(id);
    setIsAdherentDetailsOpen(true);
  };

  const handleViewReceipt = (cot: Cotisation) => {
    setSelectedReceiptCotisation(cot);
    setIsReceiptModalOpen(true);
  };

  const handleImmatriculerAdherent = (adh: Adherent) => {
    setImmatriculationTargetAdherent(adh);
    setIsImmatriculationModalOpen(true);
  };

  const handleOpenDossier = (adh: Adherent) => {
    const existingDossier = dossiers.find(
      (d) => d.adherentId === adh.id || d.matricule === adh.matricule
    );
    if (existingDossier) {
      setSelectedDossier(existingDossier);
      setIsDossierModalOpen(true);
    } else {
      setActiveTab('dossiers');
    }
  };

  const handleSelectDossier = (dossier: DossierAllocations) => {
    setSelectedDossier(dossier);
    setIsDossierModalOpen(true);
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans text-slate-800 antialiased selection:bg-emerald-200">
      {/* Barre latérale */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Zone de contenu principale */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* En-tête supérieur */}
        <Header
          onToggleMobile={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          onToggleCollapseSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          isSidebarCollapsed={isSidebarCollapsed}
          onOpenNewAdherent={handleOpenNewAdherent}
          onOpenNewCotisation={() => handleOpenNewCotisation()}
          onSelectAdherent={handleSelectAdherent}
        />

        {/* Vue active */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 pb-16 sm:pb-20">
          <div className="max-w-7xl mx-auto">
            <Suspense
              fallback={
                <div className="min-h-48 flex items-center justify-center gap-3 text-sm text-slate-500" role="status" aria-live="polite">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-700" />
                  Chargement de la vue…
                </div>
              }
            >
            {activeTab === 'dashboard' && (
              <DashboardView
                onOpenNewAdherent={handleOpenNewAdherent}
                onOpenNewCotisation={() => handleOpenNewCotisation()}
                onSelectAdherent={handleSelectAdherent}
                onViewReceipt={handleViewReceipt}
              />
            )}

            {activeTab === 'adherents' && (
              <AdherentsView
                onOpenNewAdherent={handleOpenNewAdherent}
                onSelectAdherent={handleSelectAdherent}
                onEditAdherent={handleEditAdherent}
                onDeleteAdherent={handleDeleteAdherent}
                onNewCotisationForAdherent={(adh) => handleOpenNewCotisation(adh.id)}
                onImmatriculerAdherent={handleImmatriculerAdherent}
              />
            )}

            {activeTab === 'gestionnaires' && <GestionnairesView />}

            {activeTab === 'cotisations' && (
              <CotisationsView
                onOpenNewCotisation={() => handleOpenNewCotisation()}
                onSelectAdherent={handleSelectAdherent}
                onViewReceipt={handleViewReceipt}
                onEditCotisation={handleEditCotisation}
                onDeleteCotisation={handleDeleteCotisation}
              />
            )}

            {activeTab === 'finances' && (
              <DepensesView onRequestPinConfirm={requestPinConfirm} />
            )}

            {activeTab === 'paie' && (
              <PaieView onRequestPinConfirm={requestPinConfirm} />
            )}

            {activeTab === 'rapports-agents' && <RapportsAgentsCaisseView />}

            {activeTab === 'immatriculations' && (
              <ImmatriculationsView
                onSelectAdherent={handleSelectAdherent}
                onImmatriculerAdherent={handleImmatriculerAdherent}
                onOpenDossier={handleOpenDossier}
              />
            )}

            {activeTab === 'dossiers' && (
              <DossiersView
                onSelectDossier={handleSelectDossier}
                onSelectAdherent={handleSelectAdherent}
              />
            )}

            {activeTab === 'agenda' && <AgendaView />}

            {activeTab === 'rapports-reunions' && <RapportsReunionsView />}

            {activeTab === 'alertes' && (
              <AlertesView
                onSelectAdherent={handleSelectAdherent}
                onNewCotisationForAdherent={(adh) => handleOpenNewCotisation(adh.id)}
                onImmatriculerAdherent={handleImmatriculerAdherent}
                onOpenDossier={handleOpenDossier}
              />
            )}

            {activeTab === 'etats-mensuels' && <EtatsMensuelsView />}

            {activeTab === 'rapports' && <RapportsView />}

            {activeTab === 'utilisateurs' && <UtilisateursView />}

            {activeTab === 'parametres' && <ParametresView />}

            {activeTab === 'journal' && <JournalView />}
            </Suspense>
          </div>
        </main>
      </div>

      {/* --- MODALES --- */}

      {/* Modale d'ajout / modification d'adhérent */}
      <AdherentModal
        isOpen={isAdherentModalOpen}
        onClose={() => setIsAdherentModalOpen(false)}
        adherentToEdit={adherentToEdit}
        onRequestPinConfirm={requestPinConfirm}
      />

      {/* Modale d'enregistrement / modification de cotisation */}
      <CotisationModal
        isOpen={isCotisationModalOpen}
        onClose={() => {
          setIsCotisationModalOpen(false);
          setCotisationPreselectedAdherentId(null);
          setCotisationToEdit(null);
        }}
        preselectedAdherentId={cotisationPreselectedAdherentId}
        cotisationToEdit={cotisationToEdit}
        onRequestPinConfirm={requestPinConfirm}
        onSuccessCreated={(newCot) => {
          setSelectedReceiptCotisation(newCot);
          setIsReceiptModalOpen(true);
        }}
      />

      {/* Modale Fiche Détails d'adhérent & Historique */}
      <Suspense fallback={null}>
      <AdherentDetailsModal
        isOpen={isAdherentDetailsOpen}
        onClose={() => setIsAdherentDetailsOpen(false)}
        adherentId={selectedAdherentId}
        onEditAdherent={handleEditAdherent}
        onDeleteAdherent={handleDeleteAdherent}
        onNewCotisationForAdherent={(adh) => handleOpenNewCotisation(adh.id)}
        onViewReceipt={handleViewReceipt}
        onOpenImmatriculer={handleImmatriculerAdherent}
        onOpenDossier={handleOpenDossier}
      />
      </Suspense>

      {/* Modale de validation d'immatriculation CNPS */}
      <ImmatriculationModal
        isOpen={isImmatriculationModalOpen}
        onClose={() => setIsImmatriculationModalOpen(false)}
        adherent={immatriculationTargetAdherent}
      />

      {/* Modale Dossier d'allocations familiales */}
      <DossierAllocationsModal
        isOpen={isDossierModalOpen}
        onClose={() => setIsDossierModalOpen(false)}
        dossier={selectedDossier}
      />

      {/* Modale Reçu Officiel imprimable */}
      <Suspense fallback={null}>
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        cotisation={selectedReceiptCotisation}
        adherent={
          selectedReceiptCotisation
            ? adherents.find(
                (a) =>
                  a.id === selectedReceiptCotisation.adherentId ||
                  a.matricule === selectedReceiptCotisation.matricule
              ) || null
            : null
        }
        parametres={parametres}
        allCotisations={cotisations}
        defaultTypeMontant="CUMUL_MENSUEL"
      />
      </Suspense>

      {/* Modale de Sécurité Code PIN 0000 */}
      <PinConfirmModal
        isOpen={isPinModalOpen}
        onCancel={() => {
          setIsPinModalOpen(false);
          setPendingPinAction(null);
        }}
        onConfirm={handlePinSuccess}
        title={pinModalTitle}
        description={pinModalDesc}
      />
    </div>
  );
};

/** Demande le code de confirmation via la boîte de dialogue quand le serveur l'exige */
const ConfirmationCodeBridge: React.FC = () => {
  const dialog = useDialog();
  React.useEffect(() => {
    setConfirmationCodePrompt((message) =>
      dialog.prompt({
        title: 'Code de confirmation',
        message,
        placeholder: 'Code à 4 chiffres',
        inputType: 'password',
        confirmText: 'Valider',
      })
    );
    return () => setConfirmationCodePrompt(null);
  }, [dialog]);
  return null;
};

/** Trace dans le journal d'audit chaque impression lancée depuis l'application (reçus, rapports, bulletins...) */
const PrintTracker: React.FC = () => {
  const { activeTab } = useApp();
  React.useEffect(() => {
    const original = window.print.bind(window);
    window.print = () => {
      logEvent('IMPRESSION_DOCUMENT', `Impression depuis l'écran « ${activeTab} » : ${document.title}`);
      original();
    };
    return () => {
      window.print = original;
    };
  }, [activeTab]);
  return null;
};

/** Aiguillage : chargement de la session, page de connexion, changement de mot de passe imposé, application */
const Gate: React.FC = () => {
  const { status, session } = useAuth();
  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBF5EC]">
        <Loader2 className="w-8 h-8 text-[#D97F2E] animate-spin" />
      </div>
    );
  }
  if (status === 'anonymous' || !session) return <LoginPage />;
  if (session.mustChangePassword || session.user.mustChangePassword) return <ChangePasswordPage />;
  return (
    <AppProvider key={session.user.id}>
      <MainApp />
      <PrintTracker />
      <Notifications />
    </AppProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DialogProvider>
        <ConfirmationCodeBridge />
        <Gate />
      </DialogProvider>
    </AuthProvider>
  );
}
