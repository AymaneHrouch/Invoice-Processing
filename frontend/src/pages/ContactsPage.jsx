import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useTheme } from '@/contexts';
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
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

export default function ContactsPage() {
  const { isDarkMode } = useTheme();

  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // contact doc or null for new
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState(null);

  // Delete confirm state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getContacts({
        type: typeFilter || undefined,
        q: search || undefined,
      });
      setContacts(data);
    } catch {
      setError('Impossible de charger les contacts.');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
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
    setModalOpen(true);
  };

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const toggleType = (type) => {
    setForm((prev) => {
      const has = prev.contact_type.includes(type);
      if (has && prev.contact_type.length === 1) return prev; // must have at least one
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
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                typeFilter === f.value
                  ? 'bg-blue-600 text-white'
                  : isDarkMode
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
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
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
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
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? 'Modifier le contact' : 'Nouveau contact'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
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
                <Input id="c-city" value={form.city} onChange={set('city')} />
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
