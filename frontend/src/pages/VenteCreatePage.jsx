import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  UserRound,
  CalendarDays,
  Package,
  CircleDollarSign,
  Save,
  CheckCircle,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { FormField } from '@/components/ui/form-field';
import SupplierCombobox from '@/components/ui/SupplierCombobox';
import { InvoiceItems, InvoiceTags } from '@/components/invoice';
import { useTheme } from '@/contexts';
import { useCategories } from '@/hooks/useCategories';
import { currencies } from '@/constants';
import { getCompanyProfile } from '@/api/company';
import { getNextVenteNumber, createVente, validateVente } from '@/api/ventes';

const TVA_RATES = [0, 7, 10, 14, 20];

const today = () => new Date().toISOString().split('T')[0];

export default function VenteCreatePage() {
  const { isDarkMode } = useTheme();
  const navigate = useNavigate();
  const { categories } = useCategories();

  const [company, setCompany] = useState(null);
  const [nextNumber, setNextNumber] = useState('…');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    client_name: '',
    client_ice: '',
    contact_id: null,
    invoice_date: today(),
    invoice_due_date: '',
    currency: 'MAD',
    tva_rate: 20,
    category: '',
    tags: [],
    items: [],
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    Promise.all([getCompanyProfile(), getNextVenteNumber()])
      .then(([profile, num]) => {
        setCompany(profile);
        setNextNumber(num);
      })
      .catch(() => toast.error('Impossible de charger les données.'))
      .finally(() => setLoading(false));
  }, []);

  // Auto-calculate totals from items + TVA rate
  const subtotalHT = useMemo(
    () => form.items.reduce((sum, item) => sum + Number(item.total || 0), 0),
    [form.items],
  );
  const tvaAmount = useMemo(
    () => subtotalHT * (form.tva_rate / 100),
    [subtotalHT, form.tva_rate],
  );
  const totalTTC = useMemo(
    () => subtotalHT + tvaAmount,
    [subtotalHT, tvaAmount],
  );

  const set = (field) => (value) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const setEvent = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const errs = {};
    if (!form.client_name.trim())
      errs.client_name = 'Le nom du client est requis.';
    if (!form.category) errs.category = 'La catégorie est requise.';
    if (totalTTC <= 0) errs.total = 'Le montant doit être supérieur à 0.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const buildPayload = () => ({
    client_name: form.client_name.trim(),
    client_ice: form.client_ice.trim() || null,
    contact_id: form.contact_id || null,
    invoice_date: form.invoice_date || null,
    invoice_due_date: form.invoice_due_date || null,
    subtotal_ht: subtotalHT > 0 ? subtotalHT : null,
    tva: form.tva_rate,
    amount_tva: tvaAmount > 0 ? tvaAmount : null,
    total_amount: totalTTC > 0 ? totalTTC : 0.01,
    currency: form.currency,
    items: form.items,
    category: form.category,
    tags: form.tags,
  });

  const handleSaveDraft = async () => {
    if (!validate()) {
      toast.error('Veuillez corriger les erreurs.');
      return;
    }
    setSaving(true);
    try {
      await createVente(buildPayload());
      toast.success('Brouillon enregistré.');
      navigate('/ventes');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Erreur lors de la création.');
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async () => {
    if (!validate()) {
      toast.error('Veuillez corriger les erreurs.');
      return;
    }
    setSaving(true);
    try {
      const invoice = await createVente(buildPayload());
      await validateVente(invoice.id);
      toast.success('Facture validée.');
      navigate('/ventes');
    } catch (err) {
      toast.error(
        err.response?.data?.detail || 'Erreur lors de la validation.',
      );
    } finally {
      setSaving(false);
    }
  };

  const cardClass = `${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Chargement…
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <span>Ventes</span>
            <ChevronRight className="w-4 h-4" />
            <span>Nouvelle facture</span>
          </div>
          <h1
            className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
          >
            Facture{' '}
            <span className="text-blue-600 font-mono">{nextNumber}</span>
          </h1>
        </div>
      </div>

      <div className="space-y-6">
        {/* Emetteur (read-only) */}
        <Card className={cardClass}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-500 font-medium uppercase tracking-wide">
              <Building2 className="w-4 h-4" />
              Émetteur
            </CardTitle>
          </CardHeader>
          <CardContent>
            {company ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p
                    className={`font-semibold text-base ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
                  >
                    {company.company_name}
                  </p>
                  {company.legal_form && (
                    <p className="text-sm text-gray-500">
                      {company.legal_form}
                    </p>
                  )}
                </div>
                <div className="text-sm text-gray-500 space-y-0.5">
                  {company.address && <p>{company.address}</p>}
                  {company.city && (
                    <p>
                      {company.postal_code} {company.city}
                    </p>
                  )}
                </div>
                <div className="text-sm text-gray-500 space-y-0.5 font-mono">
                  {company.ice && <p>ICE : {company.ice}</p>}
                  {company.identifiant_fiscal && (
                    <p>IF : {company.identifiant_fiscal}</p>
                  )}
                  {company.rc && <p>RC : {company.rc}</p>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-red-500">
                Profil entreprise non configuré.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Client */}
        <Card className={cardClass}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-500 font-medium uppercase tracking-wide">
              <UserRound className="w-4 h-4" />
              Client
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SupplierCombobox
              value={form.client_name}
              onChange={set('client_name')}
              onIceChange={set('client_ice')}
              onContactSelect={(c) => {
                setForm((prev) => ({
                  ...prev,
                  contact_id: c._id || null,
                  client_ice: c.ice || prev.client_ice,
                }));
              }}
              contactType="client"
              label="Nom du client"
              placeholder="Saisir ou sélectionner un client"
              required
              error={errors.client_name}
            />
            <div className="space-y-1">
              <Label>ICE client</Label>
              <div
                className={`flex items-center h-10 px-3 rounded-md border text-sm font-mono ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
              >
                {form.client_ice || <span className="text-gray-400">—</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Détails */}
        <Card className={cardClass}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-500 font-medium uppercase tracking-wide">
              <CalendarDays className="w-4 h-4" />
              Détails
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField
              id="invoice_date"
              type="date"
              label="Date de facture"
              value={form.invoice_date}
              onChange={setEvent('invoice_date')}
            />
            <FormField
              id="invoice_due_date"
              type="date"
              label="Date d'échéance"
              value={form.invoice_due_date}
              onChange={setEvent('invoice_due_date')}
            />
            <FormField
              type="select"
              label="Devise"
              value={form.currency}
              onChange={set('currency')}
              options={currencies}
              icon={CircleDollarSign}
            />
            <FormField
              type="select"
              label="Catégorie"
              value={form.category}
              onChange={set('category')}
              options={categories}
              placeholder="Sélectionner"
              error={errors.category}
              required
            />
          </CardContent>
        </Card>

        {/* Lignes */}
        <Card className={cardClass}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-500 font-medium uppercase tracking-wide">
              <Package className="w-4 h-4" />
              Lignes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceItems
              items={form.items}
              currency={form.currency}
              onItemsChange={set('items')}
            />
          </CardContent>
        </Card>

        {/* Tags */}
        <Card className={cardClass}>
          <CardContent className="pt-6">
            <InvoiceTags tags={form.tags} onTagsChange={set('tags')} />
          </CardContent>
        </Card>

        {/* Récapitulatif */}
        <Card className={cardClass}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2 text-gray-500 font-medium uppercase tracking-wide">
              <CircleDollarSign className="w-4 h-4" />
              Récapitulatif
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* TVA rate selector */}
            <div className="flex items-center gap-3">
              <Label className="w-32 shrink-0">Taux TVA</Label>
              <select
                value={form.tva_rate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    tva_rate: Number(e.target.value),
                  }))
                }
                className={`flex h-9 w-32 rounded-md border px-3 py-1 text-sm shadow-sm ${
                  isDarkMode
                    ? 'bg-gray-700 border-gray-600 text-white'
                    : 'bg-white border-input'
                }`}
              >
                {TVA_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}%
                  </option>
                ))}
              </select>
            </div>

            <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />

            {/* Totals */}
            <div className="space-y-2 max-w-xs ml-auto text-sm">
              <div className="flex justify-between">
                <span
                  className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}
                >
                  Sous-total HT
                </span>
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  {subtotalHT.toFixed(2)} {form.currency}
                </span>
              </div>
              <div className="flex justify-between">
                <span
                  className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}
                >
                  TVA ({form.tva_rate}%)
                </span>
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  {tvaAmount.toFixed(2)} {form.currency}
                </span>
              </div>
              <Separator
                className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'}
              />
              <div className="flex justify-between font-semibold text-base">
                <span className={isDarkMode ? 'text-white' : 'text-gray-900'}>
                  Total TTC
                </span>
                <span className="text-blue-600">
                  {totalTTC.toFixed(2)} {form.currency}
                </span>
              </div>
            </div>

            {errors.total && (
              <p className="text-sm text-red-500">{errors.total}</p>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleSaveDraft}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement…' : 'Enregistrer brouillon'}
          </Button>
          <Button
            type="button"
            onClick={handleValidate}
            disabled={saving}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
          >
            <CheckCircle className="w-4 h-4" />
            {saving ? 'Validation…' : 'Valider la facture'}
          </Button>
        </div>
      </div>
    </div>
  );
}
