import { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/contexts';
import {
  listFirms,
  createFirm,
  deleteFirm,
  getFirmInventory,
} from '@/api/firms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
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

export default function FirmsPage() {
  const { isDarkMode } = useTheme();
  const [firms, setFirms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdCreds, setCreatedCreds] = useState(null); // { firm_name, admin_email, temp_password }
  const [copied, setCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [inventory, setInventory] = useState(null);
  const [form, setForm] = useState({
    firm_name: '',
    admin_full_name: '',
    admin_email: '',
  });

  const load = () =>
    listFirms()
      .then(setFirms)
      .catch(() => toast.error('Impossible de charger les cabinets.'))
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await createFirm(form);
      setCreatedCreds(res);
      setModalOpen(false);
      setForm({ firm_name: '', admin_full_name: '', admin_email: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteFirm(deleteTarget._id);
      toast.success('Cabinet supprimé.');
      setDeleteTarget(null);
      setInventory(null);
      load();
    } catch {
      toast.error('Erreur lors de la suppression.');
    }
  };

  const copyPassword = () => {
    navigator.clipboard.writeText(createdCreds.temp_password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cardClass = isDarkMode
    ? 'bg-gray-800 border-gray-700'
    : 'bg-white border-gray-200';
  const inputClass = isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : '';

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-blue-600" />
          <div>
            <h1
              className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
            >
              Cabinets comptables
            </h1>
            <p
              className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
            >
              Gérer les organisations clientes
            </p>
          </div>
        </div>
        <Button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouveau cabinet
        </Button>
      </div>

      {/* Firms table */}
      <div
        className={`rounded-xl border shadow-sm overflow-hidden ${cardClass}`}
      >
        {loading ? (
          <div className="p-8 text-center text-gray-500">Chargement…</div>
        ) : firms.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            Aucun cabinet créé.
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}>
              <tr>
                {['Cabinet', 'Admin', 'Entreprises', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}
            >
              {firms.map((f) => (
                <tr key={f._id}>
                  <td className="px-4 py-3 font-medium">{f.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {f.admin_email || '—'}
                  </td>
                  <td className="px-4 py-3 text-sm">{f.company_count}</td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={async () => {
                        setDeleteTarget(f);
                        setInventory(null);
                        getFirmInventory(f._id)
                          .then(setInventory)
                          .catch(() => setInventory({}));
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => !o && setModalOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nouveau cabinet</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <Label>Nom du cabinet *</Label>
              <Input
                value={form.firm_name}
                onChange={set('firm_name')}
                required
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Nom complet de l'administrateur *</Label>
              <Input
                value={form.admin_full_name}
                onChange={set('admin_full_name')}
                required
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Email de l'administrateur *</Label>
              <Input
                type="email"
                value={form.admin_email}
                onChange={set('admin_email')}
                required
                className={inputClass}
              />
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Annuler
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving}>
                {saving ? 'Création…' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => {
          if (!o) {
            setDeleteTarget(null);
            setInventory(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Supprimer le cabinet "{deleteTarget?.name}" ?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Cette action est irréversible. Les données suivantes seront
                  supprimées :
                </p>
                {inventory === null ? (
                  <p className="text-sm text-gray-400">
                    Chargement de l'inventaire…
                  </p>
                ) : (
                  <ul className="text-sm rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900 p-3 space-y-1">
                    <li>
                      <span className="font-semibold">
                        {inventory.users ?? '—'}
                      </span>{' '}
                      utilisateur{inventory.users > 1 ? 's' : ''}
                    </li>
                    <li>
                      <span className="font-semibold">
                        {inventory.companies ?? '—'}
                      </span>{' '}
                      entreprise{inventory.companies > 1 ? 's' : ''}
                    </li>
                    <li>
                      <span className="font-semibold">
                        {inventory.invoices ?? '—'}
                      </span>{' '}
                      facture{inventory.invoices > 1 ? 's' : ''}
                    </li>
                    <li>
                      <span className="font-semibold">
                        {inventory.contacts ?? '—'}
                      </span>{' '}
                      contact{inventory.contacts > 1 ? 's' : ''}
                    </li>
                  </ul>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Supprimer définitivement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Credentials reveal modal */}
      {createdCreds && (
        <Dialog
          open={!!createdCreds}
          onOpenChange={() => setCreatedCreds(null)}
        >
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Cabinet créé avec succès</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <p
                className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
              >
                Transmettez ces identifiants à l'administrateur du cabinet. Le
                mot de passe ne sera plus affiché après fermeture.
              </p>
              <div
                className={`rounded-lg p-4 space-y-2 font-mono text-sm ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}
              >
                <div>
                  <span className="text-gray-400">Cabinet :</span>{' '}
                  {createdCreds.firm_name}
                </div>
                <div>
                  <span className="text-gray-400">Email :</span>{' '}
                  {createdCreds.admin_email}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">Mot de passe :</span>
                  <span className="font-semibold">
                    {createdCreds.temp_password}
                  </span>
                  <button
                    onClick={copyPassword}
                    className="ml-auto text-blue-500 hover:text-blue-600 cursor-pointer"
                  >
                    {copied ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => setCreatedCreds(null)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
