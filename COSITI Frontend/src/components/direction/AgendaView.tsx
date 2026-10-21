import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import {
  PartenaireDirection,
  RendezVousDirection,
  NoteSpecifiqueDirection,
  SecteurPartenaire,
  StatutPartenariat,
  DegrePriorite,
  ModaliteRdv,
  StatutRendezVous,
  CategorieNoteDirection,
  SECTEURS_PARTENAIRES,
  STATUTS_PARTENARIAT,
  STATUTS_RENDEZ_VOUS,
  CATEGORIES_NOTES_DIRECTION,
} from '../../types';
import {
  CalendarDays,
  Users2,
  FileText,
  Plus,
  Search,
  Trash2,
  Edit3,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Mail,
  ShieldCheck,
  Star,
  ExternalLink,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

export const AgendaView: React.FC = () => {
  const {
    partenaires,
    rendezVous,
    notesDirection,
    currentUser,
    addPartenaire,
    updatePartenaire,
    deletePartenaire,
    addRendezVous,
    updateRendezVous,
    deleteRendezVous,
    addNoteDirection,
    updateNoteDirection,
    deleteNoteDirection,
  } = useApp();
  const dialog = useDialog();

  // Onglet actif : 'agenda' | 'partenaires' | 'notes'
  const [activeTab, setActiveTab] = useState<'agenda' | 'partenaires' | 'notes'>('agenda');

  // Filtres
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatutRdv, setFilterStatutRdv] = useState<string>('all');
  const [filterSecteur, setFilterSecteur] = useState<string>('all');
  const [filterCategorieNote, setFilterCategorieNote] = useState<string>('all');

  // Modal Partenaire
  const [isPartenaireModalOpen, setIsPartenaireModalOpen] = useState(false);
  const [editingPartenaire, setEditingPartenaire] = useState<PartenaireDirection | null>(null);
  const [partenaireForm, setPartenaireForm] = useState({
    nomOrganisation: '',
    sigle: '',
    secteur: SECTEURS_PARTENAIRES[0] as SecteurPartenaire,
    personneContact: '',
    titreContact: '',
    telephone: '',
    email: '',
    adresse: '',
    statut: STATUTS_PARTENARIAT[0] as StatutPartenariat,
    priorite: 'Stratégique (P1)' as DegrePriorite,
    potentielSynergie: '',
    notesHistorique: '',
  });

  // Modal Rendez-vous
  const [isRdvModalOpen, setIsRdvModalOpen] = useState(false);
  const [editingRdv, setEditingRdv] = useState<RendezVousDirection | null>(null);
  const [rdvForm, setRdvForm] = useState({
    titre: '',
    partenaireId: '',
    nomInterlocuteurOuPartenaire: '',
    date: new Date().toISOString().split('T')[0],
    heure: '10:00',
    dureeEstimee: '1h00',
    modalite: 'Siège COSITI' as ModaliteRdv,
    lieuPrecision: '',
    participantsDirection: 'DG & DGA',
    responsablePrincipal: 'DG' as 'DG' | 'DGA' | 'DAF',
    statut: 'Prévu' as StatutRendezVous,
    ordreDuJour: '',
    compteRendu: '',
    engagementsEtActions: '',
    dateRappel: '',
  });

  // Modal Note Spécifique
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<NoteSpecifiqueDirection | null>(null);
  const [noteForm, setNoteForm] = useState({
    titre: '',
    date: new Date().toISOString().split('T')[0],
    categorie: CATEGORIES_NOTES_DIRECTION[0] as CategorieNoteDirection,
    partenaireLie: '',
    rendezVousLie: '',
    contenu: '',
    pointsCles: '',
    prochaineEcheance: '',
    niveauConfidentialite: 'Confidentiel Direction (DG / DGA)' as NoteSpecifiqueDirection['niveauConfidentialite'],
  });

  // Tri des rendez-vous par date et heure
  const sortedRendezVous = useMemo(() => {
    return [...rendezVous].sort((a, b) => {
      const dateA = new Date(`${a.date}T${a.heure || '00:00'}`).getTime();
      const dateB = new Date(`${b.date}T${b.heure || '00:00'}`).getTime();
      return dateA - dateB;
    });
  }, [rendezVous]);

  // Rendez-vous filtrés
  const filteredRendezVous = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (sortedRendezVous || []).filter((r) => {
      if (!r) return false;
      const titre = (r.titre || '').toLowerCase();
      const interlocuteur = (r.nomInterlocuteurOuPartenaire || '').toLowerCase();
      const ordre = (r.ordreDuJour || '').toLowerCase();
      const matchesSearch =
        !q ||
        titre.includes(q) ||
        interlocuteur.includes(q) ||
        ordre.includes(q);
      const matchesStatut = filterStatutRdv === 'all' || r.statut === filterStatutRdv;
      return matchesSearch && matchesStatut;
    });
  }, [sortedRendezVous, searchTerm, filterStatutRdv]);

  // Partenaires filtrés
  const filteredPartenaires = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (partenaires || []).filter((p) => {
      if (!p) return false;
      const nom = (p.nomOrganisation || '').toLowerCase();
      const sigle = (p.sigle || '').toLowerCase();
      const contact = (p.personneContact || '').toLowerCase();
      const tel = (p.telephone || '').toLowerCase();
      const matchesSearch =
        !q ||
        nom.includes(q) ||
        sigle.includes(q) ||
        contact.includes(q) ||
        tel.includes(q);
      const matchesSecteur = filterSecteur === 'all' || p.secteur === filterSecteur;
      return matchesSearch && matchesSecteur;
    });
  }, [partenaires, searchTerm, filterSecteur]);

  // Notes filtrées
  const filteredNotes = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (notesDirection || []).filter((n) => {
      if (!n) return false;
      const titre = (n.titre || '').toLowerCase();
      const contenu = (n.contenu || '').toLowerCase();
      const part = (n.partenaireLie || '').toLowerCase();
      const matchesSearch =
        !q ||
        titre.includes(q) ||
        contenu.includes(q) ||
        part.includes(q);
      const matchesCat = filterCategorieNote === 'all' || n.categorie === filterCategorieNote;
      return matchesSearch && matchesCat;
    });
  }, [notesDirection, searchTerm, filterCategorieNote]);

  // Handlers Partenaire
  const handleOpenNewPartenaire = () => {
    setEditingPartenaire(null);
    setPartenaireForm({
      nomOrganisation: '',
      sigle: '',
      secteur: SECTEURS_PARTENAIRES[0],
      personneContact: '',
      titreContact: '',
      telephone: '',
      email: '',
      adresse: '',
      statut: STATUTS_PARTENARIAT[0],
      priorite: 'Stratégique (P1)',
      potentielSynergie: '',
      notesHistorique: '',
    });
    setIsPartenaireModalOpen(true);
  };

  const handleEditPartenaire = (p: PartenaireDirection) => {
    setEditingPartenaire(p);
    setPartenaireForm({
      nomOrganisation: p.nomOrganisation,
      sigle: p.sigle || '',
      secteur: p.secteur,
      personneContact: p.personneContact,
      titreContact: p.titreContact,
      telephone: p.telephone,
      email: p.email || '',
      adresse: p.adresse || '',
      statut: p.statut,
      priorite: p.priorite,
      potentielSynergie: p.potentielSynergie,
      notesHistorique: p.notesHistorique || '',
    });
    setIsPartenaireModalOpen(true);
  };

  const handleSavePartenaire = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partenaireForm.nomOrganisation.trim()) {
      await dialog.alert({
        title: 'Organisation requise',
        message: "Veuillez renseigner le nom de l'organisation partenaire.",
        variant: 'warning',
      });
      return;
    }
    if (!partenaireForm.personneContact.trim()) {
      await dialog.alert({
        title: 'Contact requis',
        message: 'Veuillez renseigner le nom de la personne contact.',
        variant: 'warning',
      });
      return;
    }

    if (editingPartenaire) {
      updatePartenaire(editingPartenaire.id, {
        nomOrganisation: partenaireForm.nomOrganisation.trim(),
        sigle: partenaireForm.sigle.trim() || undefined,
        secteur: partenaireForm.secteur,
        personneContact: partenaireForm.personneContact.trim(),
        titreContact: partenaireForm.titreContact.trim(),
        telephone: partenaireForm.telephone.trim(),
        email: partenaireForm.email.trim() || undefined,
        adresse: partenaireForm.adresse.trim() || undefined,
        statut: partenaireForm.statut,
        priorite: partenaireForm.priorite,
        potentielSynergie: partenaireForm.potentielSynergie.trim(),
        notesHistorique: partenaireForm.notesHistorique.trim() || undefined,
      });
    } else {
      addPartenaire({
        nomOrganisation: partenaireForm.nomOrganisation.trim(),
        sigle: partenaireForm.sigle.trim() || undefined,
        secteur: partenaireForm.secteur,
        personneContact: partenaireForm.personneContact.trim(),
        titreContact: partenaireForm.titreContact.trim(),
        telephone: partenaireForm.telephone.trim(),
        email: partenaireForm.email.trim() || undefined,
        adresse: partenaireForm.adresse.trim() || undefined,
        statut: partenaireForm.statut,
        priorite: partenaireForm.priorite,
        potentielSynergie: partenaireForm.potentielSynergie.trim(),
        enregistrePar: currentUser?.nom || 'DG',
        notesHistorique: partenaireForm.notesHistorique.trim() || undefined,
      });
    }
    setIsPartenaireModalOpen(false);
    await dialog.alert({
      title: editingPartenaire ? 'Partenaire mis à jour' : 'Nouveau partenaire enregistré',
      message: `La fiche de « ${partenaireForm.nomOrganisation.trim()} » a été enregistrée avec succès.`,
      variant: 'success',
    });
  };

  const handleDeletePartenaire = async (p: PartenaireDirection) => {
    const confirmed = await dialog.confirm({
      title: 'Suppression de la fiche partenaire',
      message: `Voulez-vous supprimer définitivement la fiche partenaire « ${p.nomOrganisation} » ?`,
      confirmText: 'Supprimer',
      cancelText: 'Conserver',
      variant: 'danger',
      icon: 'trash',
      details: [
        { label: 'Organisation', value: p.nomOrganisation },
        { label: 'Secteur', value: p.secteur },
        { label: 'Contact', value: `${p.personneContact} (${p.telephone})` },
      ],
    });
    if (confirmed) {
      deletePartenaire(p.id);
    }
  };

  // Handlers Rendez-vous
  const handleOpenNewRdv = (prefillPartenaireId?: string) => {
    setEditingRdv(null);
    const part = prefillPartenaireId
      ? partenaires.find((p) => p.id === prefillPartenaireId)
      : null;

    setRdvForm({
      titre: part ? `Entretien avec ${part.nomOrganisation}` : '',
      partenaireId: prefillPartenaireId || '',
      nomInterlocuteurOuPartenaire: part ? `${part.nomOrganisation} (${part.personneContact})` : '',
      date: new Date().toISOString().split('T')[0],
      heure: '10:00',
      dureeEstimee: '1h00',
      modalite: 'Siège COSITI',
      lieuPrecision: '',
      participantsDirection: currentUser?.role === 'DG' ? 'Directeur Général' : 'DG & DGA',
      responsablePrincipal: (currentUser?.role as 'DG' | 'DGA') || 'DG',
      statut: 'Prévu',
      ordreDuJour: '',
      compteRendu: '',
      engagementsEtActions: '',
      dateRappel: '',
    });
    setIsRdvModalOpen(true);
  };

  const handleEditRdv = (rdv: RendezVousDirection) => {
    setEditingRdv(rdv);
    setRdvForm({
      titre: rdv.titre,
      partenaireId: rdv.partenaireId || '',
      nomInterlocuteurOuPartenaire: rdv.nomInterlocuteurOuPartenaire,
      date: rdv.date,
      heure: rdv.heure,
      dureeEstimee: rdv.dureeEstimee || '1h00',
      modalite: rdv.modalite,
      lieuPrecision: rdv.lieuPrecision || '',
      participantsDirection: rdv.participantsDirection,
      responsablePrincipal: rdv.responsablePrincipal,
      statut: rdv.statut,
      ordreDuJour: rdv.ordreDuJour,
      compteRendu: rdv.compteRendu || '',
      engagementsEtActions: rdv.engagementsEtActions || '',
      dateRappel: rdv.dateRappel || '',
    });
    setIsRdvModalOpen(true);
  };

  const handleSaveRdv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rdvForm.titre.trim()) {
      await dialog.alert({
        title: 'Objet requis',
        message: "Veuillez saisir l'objet du rendez-vous.",
        variant: 'warning',
      });
      return;
    }
    if (!rdvForm.nomInterlocuteurOuPartenaire.trim()) {
      await dialog.alert({
        title: 'Interlocuteur requis',
        message: "Veuillez renseigner le nom de l'interlocuteur ou de l'institution.",
        variant: 'warning',
      });
      return;
    }

    if (editingRdv) {
      updateRendezVous(editingRdv.id, {
        titre: rdvForm.titre.trim(),
        partenaireId: rdvForm.partenaireId || undefined,
        nomInterlocuteurOuPartenaire: rdvForm.nomInterlocuteurOuPartenaire.trim(),
        date: rdvForm.date,
        heure: rdvForm.heure,
        dureeEstimee: rdvForm.dureeEstimee.trim() || undefined,
        modalite: rdvForm.modalite,
        lieuPrecision: rdvForm.lieuPrecision.trim() || undefined,
        participantsDirection: rdvForm.participantsDirection.trim(),
        responsablePrincipal: rdvForm.responsablePrincipal,
        statut: rdvForm.statut,
        ordreDuJour: rdvForm.ordreDuJour.trim(),
        compteRendu: rdvForm.compteRendu.trim() || undefined,
        engagementsEtActions: rdvForm.engagementsEtActions.trim() || undefined,
        dateRappel: rdvForm.dateRappel || undefined,
      });
    } else {
      addRendezVous({
        titre: rdvForm.titre.trim(),
        partenaireId: rdvForm.partenaireId || undefined,
        nomInterlocuteurOuPartenaire: rdvForm.nomInterlocuteurOuPartenaire.trim(),
        date: rdvForm.date,
        heure: rdvForm.heure,
        dureeEstimee: rdvForm.dureeEstimee.trim() || undefined,
        modalite: rdvForm.modalite,
        lieuPrecision: rdvForm.lieuPrecision.trim() || undefined,
        participantsDirection: rdvForm.participantsDirection.trim(),
        responsablePrincipal: rdvForm.responsablePrincipal,
        statut: rdvForm.statut,
        ordreDuJour: rdvForm.ordreDuJour.trim(),
        compteRendu: rdvForm.compteRendu.trim() || undefined,
        engagementsEtActions: rdvForm.engagementsEtActions.trim() || undefined,
        dateRappel: rdvForm.dateRappel || undefined,
        enregistrePar: currentUser?.nom || 'DG',
      });
    }
    setIsRdvModalOpen(false);
    await dialog.alert({
      title: editingRdv ? 'Rendez-vous mis à jour' : 'Rendez-vous planifié',
      message: `L'engagement « ${rdvForm.titre.trim()} » du ${rdvForm.date} à ${rdvForm.heure} a été enregistré à l'agenda.`,
      variant: 'success',
    });
  };

  const handleDeleteRdv = async (rdv: RendezVousDirection) => {
    const confirmed = await dialog.confirm({
      title: "Suppression d'un rendez-vous",
      message: `Voulez-vous supprimer le rendez-vous « ${rdv.titre} » du ${rdv.date} ?`,
      confirmText: 'Supprimer',
      cancelText: 'Conserver',
      variant: 'danger',
      icon: 'trash',
      details: [
        { label: 'Objet', value: rdv.titre },
        { label: 'Date & Heure', value: `${rdv.date} à ${rdv.heure}` },
        { label: 'Interlocuteur', value: rdv.nomInterlocuteurOuPartenaire },
      ],
    });
    if (confirmed) {
      deleteRendezVous(rdv.id);
    }
  };

  // Handlers Notes Direction
  const handleOpenNewNote = () => {
    setEditingNote(null);
    setNoteForm({
      titre: '',
      date: new Date().toISOString().split('T')[0],
      categorie: CATEGORIES_NOTES_DIRECTION[0],
      partenaireLie: '',
      rendezVousLie: '',
      contenu: '',
      pointsCles: '',
      prochaineEcheance: '',
      niveauConfidentialite: 'Confidentiel Direction (DG / DGA)',
    });
    setIsNoteModalOpen(true);
  };

  const handleEditNote = (note: NoteSpecifiqueDirection) => {
    setEditingNote(note);
    setNoteForm({
      titre: note.titre,
      date: note.date,
      categorie: note.categorie,
      partenaireLie: note.partenaireLie || '',
      rendezVousLie: note.rendezVousLie || '',
      contenu: note.contenu,
      pointsCles: Array.isArray(note.pointsCles) ? note.pointsCles.join('\n') : '',
      prochaineEcheance: note.prochaineEcheance || '',
      niveauConfidentialite: note.niveauConfidentialite,
    });
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteForm.titre.trim()) {
      await dialog.alert({
        title: 'Titre requis',
        message: 'Veuillez spécifier le titre de la note.',
        variant: 'warning',
      });
      return;
    }
    if (!noteForm.contenu.trim()) {
      await dialog.alert({
        title: 'Contenu requis',
        message: 'Veuillez renseigner le contenu de la note.',
        variant: 'warning',
      });
      return;
    }

    const pointsArray = noteForm.pointsCles
      .split('\n')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (editingNote) {
      updateNoteDirection(editingNote.id, {
        titre: noteForm.titre.trim(),
        date: noteForm.date,
        categorie: noteForm.categorie,
        partenaireLie: noteForm.partenaireLie.trim() || undefined,
        rendezVousLie: noteForm.rendezVousLie.trim() || undefined,
        contenu: noteForm.contenu.trim(),
        pointsCles: pointsArray,
        prochaineEcheance: noteForm.prochaineEcheance || undefined,
        niveauConfidentialite: noteForm.niveauConfidentialite,
      });
    } else {
      addNoteDirection({
        titre: noteForm.titre.trim(),
        date: noteForm.date,
        categorie: noteForm.categorie,
        partenaireLie: noteForm.partenaireLie.trim() || undefined,
        rendezVousLie: noteForm.rendezVousLie.trim() || undefined,
        contenu: noteForm.contenu.trim(),
        pointsCles: pointsArray,
        prochaineEcheance: noteForm.prochaineEcheance || undefined,
        niveauConfidentialite: noteForm.niveauConfidentialite,
        auteur: currentUser?.nom ? `${currentUser.nom} (${currentUser.role})` : 'DG',
      });
    }
    setIsNoteModalOpen(false);
    await dialog.alert({
      title: editingNote ? 'Note mise à jour' : 'Note consignée',
      message: `La note stratégique « ${noteForm.titre.trim()} » a été enregistrée avec succès.`,
      variant: 'success',
    });
  };

  const handleDeleteNote = async (note: NoteSpecifiqueDirection) => {
    const confirmed = await dialog.confirm({
      title: 'Suppression de la note',
      message: `Voulez-vous supprimer définitivement la note « ${note.titre} » ?`,
      confirmText: 'Supprimer',
      cancelText: 'Conserver',
      variant: 'danger',
      icon: 'trash',
      details: [
        { label: 'Titre', value: note.titre },
        { label: 'Catégorie', value: note.categorie },
        { label: 'Date', value: note.date },
      ],
    });
    if (confirmed) {
      deleteNoteDirection(note.id);
    }
  };

  return (
    <div className="space-y-6" id="direction-agenda-view">
      {/* En-tête de l'Agenda Direction */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-1 text-xs font-bold uppercase rounded-lg bg-indigo-100 text-indigo-800 border border-indigo-200">
              Espace Direction Générale
            </span>
            <span className="text-xs text-slate-500 font-medium">
              DG (Directeur Général) & DGA (Directrice Générale Adjointe)
            </span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 mt-2 tracking-tight">
            Agenda Direction, Partenaires & Notes Stratégiques
          </h1>
          <p className="text-sm text-slate-500 mt-1 max-w-3xl">
            Gestion exclusive de l'agenda de la direction, planification des rendez-vous institutionnels,
            suivi des potentiels partenaires stratégiques et archivage des notes confidentielles à retenir.
          </p>
        </div>

        {/* Boutons d'action contextuels */}
        <div className="flex flex-wrap gap-2 shrink-0">
          {activeTab === 'agenda' && (
            <button
              type="button"
              onClick={() => handleOpenNewRdv()}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <CalendarDays className="w-4 h-4" />
              <span>Programmer un RDV</span>
            </button>
          )}

          {activeTab === 'partenaires' && (
            <button
              type="button"
              onClick={handleOpenNewPartenaire}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Users2 className="w-4 h-4" />
              <span>Nouveau Partenaire</span>
            </button>
          )}

          {activeTab === 'notes' && (
            <button
              type="button"
              onClick={handleOpenNewNote}
              className="inline-flex items-center space-x-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>Ajouter une Note</span>
            </button>
          )}
        </div>
      </div>

      {/* Cartes KPI Direction */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Rendez-vous programmés
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {rendezVous.length}
            </span>
            <span className="text-xs text-indigo-700 font-bold">
              {rendezVous.filter((r) => r.statut === 'Prévu' || r.statut === 'Confirmé').length} à venir
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Partenaires & Institutions
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Users2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {partenaires.length}
            </span>
            <span className="text-xs text-emerald-700 font-bold">
              {partenaires.filter((p) => p.priorite === 'Stratégique (P1)').length} stratégiques
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Notes spécifiques Direction
            </span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 tracking-tight">
              {notesDirection.length}
            </span>
            <span className="text-xs text-purple-700 font-bold">Points & Mémos clés</span>
          </div>
        </div>
      </div>

      {/* Barre de navigation interne */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 pt-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('agenda');
            setSearchTerm('');
          }}
          className={`flex items-center space-x-2 py-3.5 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'agenda'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <CalendarDays className="w-4 h-4" />
          <span>1. Agenda des Rendez-vous ({rendezVous.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('partenaires');
            setSearchTerm('');
          }}
          className={`flex items-center space-x-2 py-3.5 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'partenaires'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users2 className="w-4 h-4" />
          <span>2. Répertoire Partenaires ({partenaires.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('notes');
            setSearchTerm('');
          }}
          className={`flex items-center space-x-2 py-3.5 px-4 text-sm font-bold border-b-2 transition-colors cursor-pointer ${
            activeTab === 'notes'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>3. Notes Spécifiques à Retenir ({notesDirection.length})</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1 : AGENDA DES RENDEZ-VOUS */}
      {/* ========================================================================= */}
      {activeTab === 'agenda' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par objet, interlocuteur, ordre du jour..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={filterStatutRdv}
                onChange={(e) => setFilterStatutRdv(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Tous les statuts</option>
                {STATUTS_RENDEZ_VOUS.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredRendezVous.length === 0 ? (
              <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="font-bold text-slate-600">Aucun rendez-vous ne correspond aux filtres.</p>
                <button
                  type="button"
                  onClick={() => handleOpenNewRdv()}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Programmer un rendez-vous maintenant</span>
                </button>
              </div>
            ) : (
              filteredRendezVous.map((rdv) => (
                <div
                  key={rdv.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            rdv.statut === 'Confirmé'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rdv.statut === 'Prévu'
                              ? 'bg-blue-100 text-blue-800'
                              : rdv.statut === 'Tenu'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {rdv.statut}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 mt-1">{rdv.titre}</h3>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleEditRdv(rdv)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer"
                          title="Modifier le rendez-vous"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRdv(rdv)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Supprimer le rendez-vous"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div className="flex items-center space-x-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>{rdv.date}</span>
                      </div>
                      <div className="flex items-center space-x-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>
                          {rdv.heure} ({rdv.dureeEstimee || '1h'})
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5 font-medium col-span-2">
                        <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>
                          {rdv.modalite} {rdv.lieuPrecision ? `• ${rdv.lieuPrecision}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs space-y-1">
                      <div className="font-semibold text-slate-800">
                        Interlocuteur :{' '}
                        <span className="font-normal text-slate-600">
                          {rdv.nomInterlocuteurOuPartenaire}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-800">
                        Représentation Direction :{' '}
                        <span className="font-normal text-slate-600">{rdv.participantsDirection}</span>
                      </div>
                      <div className="font-semibold text-slate-800">
                        Ordre du jour :{' '}
                        <span className="font-normal text-slate-600 line-clamp-2">
                          {rdv.ordreDuJour}
                        </span>
                      </div>
                    </div>

                    {rdv.compteRendu && (
                      <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-950">
                        <span className="font-bold block mb-0.5">Compte-rendu & Décisions :</span>
                        {rdv.compteRendu}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>Pilote : {rdv.responsablePrincipal}</span>
                    <span>Enregistré par {rdv.enregistrePar}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2 : RÉPERTOIRE DES PARTENAIRES */}
      {/* ========================================================================= */}
      {activeTab === 'partenaires' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher par institution, contact, téléphone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={filterSecteur}
                onChange={(e) => setFilterSecteur(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">Tous les secteurs</option>
                {SECTEURS_PARTENAIRES.map((sec) => (
                  <option key={sec} value={sec}>
                    {sec}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPartenaires.length === 0 ? (
              <div className="md:col-span-3 bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                <Users2 className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="font-bold text-slate-600">Aucun partenaire enregistré.</p>
                <button
                  type="button"
                  onClick={handleOpenNewPartenaire}
                  className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Ajouter un partenaire institutionnel</span>
                </button>
              </div>
            ) : (
              filteredPartenaires.map((part) => (
                <div
                  key={part.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                            part.priorite === 'Stratégique (P1)'
                              ? 'bg-rose-100 text-rose-800'
                              : part.priorite === 'Prioritaire (P2)'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {part.priorite}
                        </span>
                        <h3 className="text-base font-extrabold text-slate-900 mt-1">
                          {part?.nomOrganisation} {part?.sigle ? `(${part.sigle})` : ''}
                        </h3>
                        <p className="text-xs text-slate-500 font-medium">{part.secteur}</p>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleEditPartenaire(part)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg cursor-pointer"
                          title="Modifier les informations"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePartenaire(part)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Supprimer le partenaire"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs text-slate-700">
                      <div className="font-bold text-slate-900">
                        {part.personneContact}{' '}
                        <span className="font-normal text-slate-500">({part.titreContact})</span>
                      </div>
                      <div className="flex items-center space-x-1.5 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="font-mono">{part.telephone}</span>
                      </div>
                      {part.email && (
                        <div className="flex items-center space-x-1.5 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>{part.email}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <span className="text-xs font-bold text-slate-700 block mb-0.5">
                        Potentiel de synergie & Objectifs :
                      </span>
                      <p className="text-xs text-slate-600 leading-relaxed bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                        {part.potentielSynergie}
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Statut de négociation :</span>
                      <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                        {part.statut}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('agenda');
                        handleOpenNewRdv(part.id);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1 cursor-pointer"
                    >
                      <span>Fixer un RDV</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    <span className="text-xs text-slate-400">Par {part.enregistrePar}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SECTION 3 : NOTES SPÉCIFIQUES À RETENIR */}
      {/* ========================================================================= */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Rechercher dans les notes, décisions, points clés..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={filterCategorieNote}
                onChange={(e) => setFilterCategorieNote(e.target.value)}
                className="w-full sm:w-auto px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">Toutes les catégories de notes</option>
                {CATEGORIES_NOTES_DIRECTION.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredNotes.length === 0 ? (
              <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
                <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                <p className="font-bold text-slate-600">Aucune note spécifique enregistrée.</p>
                <button
                  type="button"
                  onClick={handleOpenNewNote}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Rédiger une note de direction</span>
                </button>
              </div>
            ) : (
              filteredNotes.map((note) => (
                <div
                  key={note.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-100 text-purple-800">
                            {note.categorie}
                          </span>
                          <span className="text-xs text-slate-400 font-medium">{note.date}</span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 mt-1.5">
                          {note.titre}
                        </h3>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleEditNote(note)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg cursor-pointer"
                          title="Modifier la note"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(note)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer"
                          title="Supprimer la note"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100 whitespace-pre-line">
                      {note.contenu}
                    </div>

                    {note.pointsCles && note.pointsCles.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                          Points essentiels à retenir :
                        </span>
                        <ul className="space-y-1">
                          {note.pointsCles.map((pt, idx) => (
                            <li
                              key={idx}
                              className="text-xs text-slate-800 flex items-start space-x-1.5 bg-purple-50/50 p-2 rounded-lg border border-purple-100"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                              <span>{pt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {note.partenaireLie && (
                      <div className="text-xs text-slate-600">
                        <span className="font-bold">Partenaire concerné :</span> {note.partenaireLie}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="font-medium text-purple-900">{note.niveauConfidentialite}</span>
                    <span>Auteur : {note.auteur}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODALES DIRECTION */}
      {/* ========================================================================= */}

      {/* Modal Partenaire */}
      {isPartenaireModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-emerald-900 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Users2 className="w-5 h-5 text-emerald-300" />
                <h3 className="font-bold text-base">
                  {editingPartenaire ? 'Modifier Partenaire' : 'Enregistrer un Partenaire Stratégique'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPartenaireModalOpen(false)}
                className="text-emerald-300 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePartenaire} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Nom de l'Organisation *
                  </label>
                  <input
                    type="text"
                    required
                    value={partenaireForm.nomOrganisation}
                    onChange={(e) =>
                      setPartenaireForm({ ...partenaireForm, nomOrganisation: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: Direction Régionale CNPS, Ecobank..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Sigle</label>
                  <input
                    type="text"
                    value={partenaireForm.sigle}
                    onChange={(e) => setPartenaireForm({ ...partenaireForm, sigle: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: CNPS"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Secteur d'activité *
                  </label>
                  <select
                    value={partenaireForm.secteur}
                    onChange={(e) =>
                      setPartenaireForm({
                        ...partenaireForm,
                        secteur: e.target.value as SecteurPartenaire,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    {SECTEURS_PARTENAIRES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Degré de Priorité
                  </label>
                  <select
                    value={partenaireForm.priorite}
                    onChange={(e) =>
                      setPartenaireForm({
                        ...partenaireForm,
                        priorite: e.target.value as DegrePriorite,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="Stratégique (P1)">Stratégique (P1)</option>
                    <option value="Prioritaire (P2)">Prioritaire (P2)</option>
                    <option value="Standard (P3)">Standard (P3)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Personne Contact *
                  </label>
                  <input
                    type="text"
                    required
                    value={partenaireForm.personneContact}
                    onChange={(e) =>
                      setPartenaireForm({ ...partenaireForm, personneContact: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    placeholder="Nom & Prénoms"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Fonction du contact
                  </label>
                  <input
                    type="text"
                    value={partenaireForm.titreContact}
                    onChange={(e) =>
                      setPartenaireForm({ ...partenaireForm, titreContact: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ex: Directeur des Opérations"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Numéro de Téléphone *
                  </label>
                  <input
                    type="text"
                    required
                    value={partenaireForm.telephone}
                    onChange={(e) =>
                      setPartenaireForm({ ...partenaireForm, telephone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    placeholder="07 00 00 00 00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Email</label>
                  <input
                    type="email"
                    value={partenaireForm.email}
                    onChange={(e) => setPartenaireForm({ ...partenaireForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                    placeholder="contact@institution.ci"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Statut du partenariat
                </label>
                <select
                  value={partenaireForm.statut}
                  onChange={(e) =>
                    setPartenaireForm({
                      ...partenaireForm,
                      statut: e.target.value as StatutPartenariat,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                >
                  {STATUTS_PARTENARIAT.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Objectifs, Synergies & Intérêts mutuels *
                </label>
                <textarea
                  required
                  rows={2}
                  value={partenaireForm.potentielSynergie}
                  onChange={(e) =>
                    setPartenaireForm({ ...partenaireForm, potentielSynergie: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                  placeholder="Ex: Immatriculation groupée des commerçants du marché central..."
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsPartenaireModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingPartenaire ? 'Mettre à jour' : 'Enregistrer le partenaire'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Rendez-vous */}
      {isRdvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 bg-indigo-900 text-white flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center space-x-2">
                <CalendarDays className="w-5 h-5 text-indigo-300" />
                <h3 className="font-bold text-base">
                  {editingRdv ? 'Modifier le Rendez-vous' : 'Programmer un Rendez-vous Direction'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRdvModalOpen(false)}
                className="text-indigo-300 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRdv} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Objet du rendez-vous *
                </label>
                <input
                  type="text"
                  required
                  value={rdvForm.titre}
                  onChange={(e) => setRdvForm({ ...rdvForm, titre: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Séance de travail sur la convention CNPS"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Interlocuteur ou Institution *
                </label>
                <input
                  type="text"
                  required
                  value={rdvForm.nomInterlocuteurOuPartenaire}
                  onChange={(e) =>
                    setRdvForm({ ...rdvForm, nomInterlocuteurOuPartenaire: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: M. Jean B., Directeur Régional CNPS"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={rdvForm.date}
                    onChange={(e) => setRdvForm({ ...rdvForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Heure *</label>
                  <input
                    type="time"
                    required
                    value={rdvForm.heure}
                    onChange={(e) => setRdvForm({ ...rdvForm, heure: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Durée</label>
                  <input
                    type="text"
                    value={rdvForm.dureeEstimee}
                    onChange={(e) => setRdvForm({ ...rdvForm, dureeEstimee: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="1h00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Modalité</label>
                  <select
                    value={rdvForm.modalite}
                    onChange={(e) =>
                      setRdvForm({ ...rdvForm, modalite: e.target.value as ModaliteRdv })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Siège COSITI">Au Siège COSITI</option>
                    <option value="Bureaux du partenaire">Bureaux du partenaire</option>
                    <option value="Visioconférence">Visioconférence</option>
                    <option value="Appel téléphonique">Appel téléphonique</option>
                    <option value="Sur le terrain">Sur le terrain</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Statut</label>
                  <select
                    value={rdvForm.statut}
                    onChange={(e) =>
                      setRdvForm({ ...rdvForm, statut: e.target.value as StatutRendezVous })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    {STATUTS_RENDEZ_VOUS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Représentant(s) Direction
                  </label>
                  <input
                    type="text"
                    value={rdvForm.participantsDirection}
                    onChange={(e) =>
                      setRdvForm({ ...rdvForm, participantsDirection: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex: DG & DGA"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Responsable Pilote
                  </label>
                  <select
                    value={rdvForm.responsablePrincipal}
                    onChange={(e) =>
                      setRdvForm({
                        ...rdvForm,
                        responsablePrincipal: e.target.value as 'DG' | 'DGA' | 'DAF',
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="DG">Directeur Général (DG)</option>
                    <option value="DGA">Directrice Générale Adjointe (DGA)</option>
                    <option value="DAF">Directeur Admin & Financier (DAF)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Ordre du jour / Points à aborder *
                </label>
                <textarea
                  required
                  rows={2}
                  value={rdvForm.ordreDuJour}
                  onChange={(e) => setRdvForm({ ...rdvForm, ordreDuJour: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="Objectifs de la réunion et questions prioritaires..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Compte-rendu & Décisions (après tenue)
                </label>
                <textarea
                  rows={2}
                  value={rdvForm.compteRendu}
                  onChange={(e) => setRdvForm({ ...rdvForm, compteRendu: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500"
                  placeholder="Notes de synthèse et engagements convenus..."
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsRdvModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingRdv ? 'Mettre à jour' : 'Enregistrer le rendez-vous'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Note Spécifique */}
      {isNoteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 bg-purple-900 text-white flex justify-between items-center sticky top-0 z-10">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-purple-300" />
                <h3 className="font-bold text-base">
                  {editingNote ? 'Modifier la note de Direction' : 'Nouvelle Note Spécifique à Retenir'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNoteModalOpen(false)}
                className="text-purple-300 hover:text-white p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Titre de la note *
                </label>
                <input
                  type="text"
                  required
                  value={noteForm.titre}
                  onChange={(e) => setNoteForm({ ...noteForm, titre: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder="Ex: Point d'étape sur la négociation avec les coopératives agricoles"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={noteForm.date}
                    onChange={(e) => setNoteForm({ ...noteForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Catégorie</label>
                  <select
                    value={noteForm.categorie}
                    onChange={(e) =>
                      setNoteForm({
                        ...noteForm,
                        categorie: e.target.value as CategorieNoteDirection,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    {CATEGORIES_NOTES_DIRECTION.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Contenu détaillé & Contexte *
                </label>
                <textarea
                  required
                  rows={4}
                  value={noteForm.contenu}
                  onChange={(e) => setNoteForm({ ...noteForm, contenu: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder="Détails importants, contexte des échanges, clauses discutées..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Points essentiels à retenir (1 par ligne)
                </label>
                <textarea
                  rows={3}
                  value={noteForm.pointsCles}
                  onChange={(e) => setNoteForm({ ...noteForm, pointsCles: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                  placeholder="Relancer avant le 15 du mois&#10;Préparer le projet de convention tripartite&#10;Contrôler le compte séquestre"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Partenaire associé (Optionnel)
                  </label>
                  <input
                    type="text"
                    value={noteForm.partenaireLie}
                    onChange={(e) => setNoteForm({ ...noteForm, partenaireLie: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                    placeholder="Nom du partenaire"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Niveau de confidentialité
                  </label>
                  <select
                    value={noteForm.niveauConfidentialite}
                    onChange={(e) =>
                      setNoteForm({
                        ...noteForm,
                        niveauConfidentialite: e.target.value as NoteSpecifiqueDirection['niveauConfidentialite'],
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Confidentiel Direction (DG / DGA)">Confidentiel Direction (DG / DGA)</option>
                    <option value="Direction Élargie">Direction Élargie</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsNoteModalOpen(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-xs cursor-pointer"
                >
                  {editingNote ? 'Mettre à jour' : 'Enregistrer la note'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
