import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Users, Plus, Pencil, Trash2, Search, FileText } from 'lucide-react';
import { useTheme } from '@/contexts';
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  getContactInvoices,
  getContactInvoiceSummaries,
} from '@/api/contacts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const TYPE_FILTERS = [
  { value: '', label: 'Tous' },
  { value: 'client', label: 'Clients' },
  { value: 'supplier', label: 'Fournisseurs' },
];

const EMPTY_FORM = {
  name: '',
  ice: '',
  identifiant_fiscal: '',
  rc: '',
  address: '',
  city: '',
  phone: '',
  email: '',
  contact_type: ['client'],
  notes: '',
};

const typeBadge = (types) =>
  types.map((t) => (
    <Badge
      key={t}
      className={
        t === 'client'
          ? 'bg-blue-100 text-blue-700 border-blue-200'
          : 'bg-purple-100 text-purple-700 border-purple-200'
      }
      variant="outline"
    >
      {t === 'client' ? 'Client' : 'Fournisseur'}
    </Badge>
  ));

const formatAmt = (amount, currency = 'MAD') =>
  new Intl.NumberFormat('fr-MA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount) +
  ' ' +
  currency;

const directionBadge = (dir) =>
  dir === 'outgoing' ? (
    <Badge
      className="bg-orange-100 text-orange-700 border-orange-200 text-xs"
      variant="outline"
    >
      Vente
    </Badge>
  ) : (
    <Badge
      className="bg-blue-100 text-blue-700 border-blue-200 text-xs"
      variant="outline"
    >
      Achat
    </Badge>
  );

export default function ContactsPage() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [invoiceSummaries, setInvoiceSummaries] = useState({});
  const [typeCounts, setTypeCounts] = useState({
    all: 0,
    client: 0,
    supplier: 0,
  });

  const [typeFilter, setTypeFilter] = useState(
    () => searchParams.get('type') || '',
  );
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Edit/create modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState('info'); // 'info' | 'history'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Invoice history state (inside modal)
  const [historyContact, setHistoryContact] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, summaries, all] = await Promise.all([
        getContacts({ type: typeFilter || undefined, q: search || undefined }),
        getContactInvoiceSummaries().catch(() => ({})),
        getContacts(),
      ]);
      setContacts(data);
      setInvoiceSummaries(summaries);
      setTypeCounts({
        all: all.length,
        client: all.filter((c) => c.contact_type?.includes('client')).length,
        supplier: all.filter((c) => c.contact_type?.includes('supplier'))
          .length,
      });
    } catch {
      setError('Impossible de charger les contacts.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  useEffect(() => {
    setTypeFilter(searchParams.get('type') || '');
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...EMPTY_FORM,
      contact_type: typeFilter === 'supplier' ? ['supplier'] : ['client'],
    });
    setFormError(null);
    setModalTab('info');
    setHistoryData(null);
    setModalOpen(true);
  };

  const openEdit = (contact) => {
    setEditing(contact);
    setForm({
      name: contact.name || '',
      ice: contact.ice || '',
      identifiant_fiscal: contact.identifiant_fiscal || '',
      rc: contact.rc || '',
      address: contact.address || '',
      city: contact.city || '',
      phone: contact.phone || '',
      email: contact.email || '',
      contact_type: contact.contact_type || ['client'],
      notes: contact.notes || '',
    });
    setFormError(null);
    setModalTab('info');
    setHistoryData(null);
    setHistoryContact(contact);
    setModalOpen(true);
  };

  const handleTabChange = async (tab) => {
    setModalTab(tab);
    if (tab === 'history' && editing && !historyData) {
      setHistoryLoading(true);
      try {
        const data = await getContactInvoices(editing._id);
        setHistoryData(data);
      } catch {
        setHistoryData({
          invoices: [],
          summary: { count: 0, total_amount: 0 },
        });
      } finally {
        setHistoryLoading(false);
      }
    }
  };

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const toggleType = (type) => {
    setForm((prev) => {
      const has = prev.contact_type.includes(type);
      if (has && prev.contact_type.length === 1) return prev;
      return {
        ...prev,
        contact_type: has
          ? prev.contact_type.filter((t) => t !== type)
          : [...prev.contact_type, type],
      };
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      const payload = { ...form };
      if (editing) {
        await updateContact(editing._id, payload);
      } else {
        await createContact(payload);
        window.dispatchEvent(new CustomEvent('contacts:updated'));
      }
      setModalOpen(false);
      fetchContacts();
    } catch (err) {
      setFormError(
        err.response?.data?.detail || 'Erreur lors de la sauvegarde.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteContact(deleteTarget._id);
      setDeleteTarget(null);
      fetchContacts();
    } catch {
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const cardClass = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const textClass = isDarkMode ? 'text-white' : 'text-gray-900';
  const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const inputClass = isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : '';
  const theadClass = isDarkMode
    ? 'bg-gray-700 text-gray-300'
    : 'bg-gray-50 text-gray-600';
  const rowClass = isDarkMode
    ? 'border-gray-700 hover:bg-gray-700/50'
    : 'border-gray-100 hover:bg-gray-50';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="w-7 h-7 text-blue-600" />
          <div>
            <h1 className={`text-2xl font-semibold ${textClass}`}>Contacts</h1>
            <p className={`text-sm ${subTextClass}`}>Clients et fournisseurs</p>
          </div>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nouveau contact
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Rechercher par nom, ICE, ville…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className={`pl-9 ${inputClass}`}
          />
        </div>
        <div className="flex gap-1">
          {TYPE_FILTERS.map((f) => {
            const count = typeCounts[f.value || 'all'];
            const active = typeFilter === f.value;
            return (
              <button
                key={f.value}
                onClick={() => setTypeFilter(f.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  active
                    ? 'bg-blue-600 text-white'
                    : isDarkMode
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {f.label}
                {count > 0 && (
                  <span
                    className={`text-xs rounded-full px-1.5 py-0 leading-5 font-semibold ${
                      active
                        ? 'bg-white/25 text-white'
                        : isDarkMode
                          ? 'bg-gray-600 text-gray-200'
                          : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <Card className={cardClass}>
        <CardContent className="p-0">
          {loading ? (
            <div className={`py-16 text-center text-sm ${subTextClass}`}>
              Chargement…
            </div>
          ) : contacts.length === 0 ? (
            <div className={`py-16 text-center text-sm ${subTextClass}`}>
              Aucun contact trouvé.{' '}
              <button
                onClick={openCreate}
                className="text-blue-600 hover:underline"
              >
                Ajouter le premier
              </button>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className={`${theadClass} text-xs uppercase tracking-wide`}>
                  <th className="px-4 py-3 text-left">Nom</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">ICE</th>
                  <th className="px-4 py-3 text-left">Ville</th>
                  <th className="px-4 py-3 text-left">Téléphone</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-center">Factures</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => {
                  const summary = invoiceSummaries[c._id];
                  return (
                    <tr key={c._id} className={`border-t ${rowClass}`}>
                      <td className={`px-4 py-3 font-medium ${textClass}`}>
                        {c.name}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {typeBadge(c.contact_type)}
                        </div>
                      </td>
                      <td
                        className={`px-4 py-3 font-mono text-xs ${subTextClass}`}
                      >
                        {c.ice || '—'}
                      </td>
                      <td className={`px-4 py-3 ${subTextClass}`}>
                        {c.city || '—'}
                      </td>
                      <td className={`px-4 py-3 ${subTextClass}`}>
                        {c.phone || '—'}
                      </td>
                      <td className={`px-4 py-3 ${subTextClass}`}>
                        {c.email || '—'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {summary ? (
                          <button
                            onClick={() => openEdit(c)}
                            className="inline-flex flex-col items-center gap-0.5 hover:text-blue-600 transition-colors"
                            title="Voir les factures"
                          >
                            <span className={`font-semibold ${textClass}`}>
                              {summary.count}
                            </span>
                            <span className={`text-xs ${subTextClass}`}>
                              {formatAmt(summary.total_amount)}
                            </span>
                          </button>
                        ) : (
                          <span className={`text-xs ${subTextClass}`}>—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => openEdit(c)}
                            className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-blue-600"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(c)}
                            className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-500 hover:text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Modifier le contact' : 'Nouveau contact'}
            </DialogTitle>
          </DialogHeader>

          {/* Tabs (only when editing) */}
          {editing && (
            <div className="flex border-b border-gray-200 dark:border-gray-700 -mx-6 px-6">
              <button
                onClick={() => handleTabChange('info')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  modalTab === 'info'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Informations
              </button>
              <button
                onClick={() => handleTabChange('history')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-1.5 ${
                  modalTab === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Historique
                {invoiceSummaries[editing._id]?.count > 0 && (
                  <Badge className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0 min-w-0">
                    {invoiceSummaries[editing._id].count}
                  </Badge>
                )}
              </button>
            </div>
          )}

          <div className="overflow-y-auto flex-1">
            {modalTab === 'info' && (
              <form onSubmit={handleSave} className="space-y-4 pt-4">
                {formError && (
                  <div className="bg-red-50 border border-red-200 text-red-700 rounded px-3 py-2 text-sm">
                    {formError}
                  </div>
                )}

                {/* Type toggle */}
                <div className="flex flex-col gap-1.5">
                  <Label>Type *</Label>
                  <div className="flex gap-2">
                    {['client', 'supplier'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => toggleType(t)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                          form.contact_type.includes(t)
                            ? t === 'client'
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {t === 'client' ? 'Client' : 'Fournisseur'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label htmlFor="c-name">Nom *</Label>
                    <Input
                      id="c-name"
                      value={form.name}
                      onChange={set('name')}
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="c-ice">ICE</Label>
                    <Input
                      id="c-ice"
                      value={form.ice}
                      onChange={set('ice')}
                      placeholder="15 chiffres"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="c-if">Identifiant Fiscal</Label>
                    <Input
                      id="c-if"
                      value={form.identifiant_fiscal}
                      onChange={set('identifiant_fiscal')}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="c-rc">RC</Label>
                    <Input id="c-rc" value={form.rc} onChange={set('rc')} />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="c-city">Ville</Label>
                    <Input
                      id="c-city"
                      value={form.city}
                      onChange={set('city')}
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label htmlFor="c-address">Adresse</Label>
                    <Input
                      id="c-address"
                      value={form.address}
                      onChange={set('address')}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="c-phone">Téléphone</Label>
                    <Input
                      id="c-phone"
                      value={form.phone}
                      onChange={set('phone')}
                      type="tel"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="c-email">Email</Label>
                    <Input
                      id="c-email"
                      value={form.email}
                      onChange={set('email')}
                      type="email"
                    />
                  </div>
                  <div className="col-span-2 flex flex-col gap-1.5">
                    <Label htmlFor="c-notes">Notes</Label>
                    <Input
                      id="c-notes"
                      value={form.notes}
                      onChange={set('notes')}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setModalOpen(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Enregistrement…' : 'Enregistrer'}
                  </Button>
                </DialogFooter>
              </form>
            )}

            {modalTab === 'history' && (
              <div className="pt-4">
                {historyLoading ? (
                  <div className="py-8 text-center text-sm text-gray-400">
                    Chargement de l&apos;historique…
                  </div>
                ) : historyData ? (
                  <>
                    <div className="flex items-center gap-4 mb-4 text-sm">
                      <span className={subTextClass}>
                        <strong className={textClass}>
                          {historyData.summary.count}
                        </strong>{' '}
                        facture{historyData.summary.count > 1 ? 's' : ''}
                      </span>
                      <span className={subTextClass}>
                        Total :{' '}
                        <strong className="text-green-600 dark:text-green-400">
                          {formatAmt(historyData.summary.total_amount)}
                        </strong>
                      </span>
                    </div>
                    {historyData.invoices.length === 0 ? (
                      <p className={`text-sm ${subTextClass}`}>
                        Aucune facture trouvée pour ce contact.
                      </p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr
                            className={`text-xs uppercase tracking-wide ${
                              isDarkMode
                                ? 'bg-gray-700 text-gray-300'
                                : 'bg-gray-50 text-gray-500'
                            }`}
                          >
                            <th className="px-3 py-2 text-left">N°</th>
                            <th className="px-3 py-2 text-left">Date</th>
                            <th className="px-3 py-2 text-left">Type</th>
                            <th className="px-3 py-2 text-left">Statut</th>
                            <th className="px-3 py-2 text-right">Montant</th>
                          </tr>
                        </thead>
                        <tbody>
                          {historyData.invoices.map((inv) => (
                            <tr
                              key={inv.id}
                              onClick={() => {
                                const path =
                                  inv.direction === 'outgoing'
                                    ? `/ventes?edit=${inv.id}`
                                    : `/achats?edit=${inv.id}`;
                                setModalOpen(false);
                                navigate(path);
                              }}
                              className={`border-t cursor-pointer ${rowClass}`}
                            >
                              <td
                                className={`px-3 py-2.5 font-medium ${textClass}`}
                              >
                                {inv.invoice_number || '—'}
                              </td>
                              <td className={`px-3 py-2.5 ${subTextClass}`}>
                                {inv.invoice_date
                                  ? new Date(
                                      inv.invoice_date,
                                    ).toLocaleDateString('fr-MA')
                                  : '—'}
                              </td>
                              <td className="px-3 py-2.5">
                                {directionBadge(inv.direction)}
                              </td>
                              <td
                                className={`px-3 py-2.5 ${subTextClass} capitalize`}
                              >
                                {inv.status || '—'}
                              </td>
                              <td className="px-3 py-2.5 text-right font-semibold text-green-600 dark:text-green-400">
                                {formatAmt(inv.total_amount, inv.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce contact ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteTarget?.name}</strong> sera définitivement
              supprimé. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
