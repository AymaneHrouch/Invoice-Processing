import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, Save, X, Plus, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from '@/contexts';
import { getActiveCompany, updateCompany, createCompany } from '@/api/company';
import { switchCompany as apiSwitchCompany } from '@/api/auth';
import { setAuthToken } from '@/utils/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const DEFAULT_CATEGORIES = [
  'Services',
  'Equipment',
  'Software',
  'Travel',
  'Marketing',
  'Utilities',
  'Others',
];

const LEGAL_FORMS = [
  'SARL',
  'SA',
  'SAS',
  'SARLAU',
  'Auto-entrepreneur',
  'Autre',
];
const TVA_RATES = [0, 7, 10, 14, 20];

const Field = ({ label, id, children }) => (
  <div className="flex flex-col gap-1.5">
    <Label htmlFor={id}>{label}</Label>
    {children}
  </div>
);

export default function CompanyProfilePage({
  createMode: createModeProp = false,
}) {
  const { isDarkMode } = useTheme();
  const { state } = useLocation();
  const navigate = useNavigate();
  const isOnboarding = state?.onboarding === true;
  const [createMode, setCreateMode] = useState(createModeProp);
  const [companyId, setCompanyId] = useState(null);

  const [form, setForm] = useState({
    company_name: '',
    legal_form: '',
    capital: '',
    ice: '',
    identifiant_fiscal: '',
    rc: '',
    patente: '',
    cnss: '',
    address: '',
    city: '',
    postal_code: '',
    phone: '',
    email: '',
    bank_name: '',
    bank_account: '',
    logo_url: '',
    primary_color: '#2563EB',
    custom_footer: '',
    invoice_prefix: 'FAC',
    default_tva_rate: 20,
    default_currency: 'MAD',
  });

  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [newCategory, setNewCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (createModeProp) {
      setLoading(false);
      return;
    }
    getActiveCompany()
      .then((data) => {
        setCompanyId(data._id);
        setForm((prev) => ({ ...prev, ...data }));
        if (Array.isArray(data.categories) && data.categories.length > 0) {
          setCategories(data.categories);
        }
      })
      .catch((err) => {
        if (err.response?.status === 404) {
          // No company exists yet — treat this page as create mode
          setCreateMode(true);
        } else {
          setError('Failed to load company profile.');
        }
      })
      .finally(() => setLoading(false));
  }, [createModeProp]);

  const set = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (createMode) {
        const created = await createCompany({ ...form, categories });
        const { access_token } = await apiSwitchCompany(created._id);
        setAuthToken(access_token);
        toast.success('Entreprise créée avec succès.');
        navigate('/company');
        window.location.reload();
      } else {
        const saved = await updateCompany(companyId, { ...form, categories });
        setForm((prev) => ({ ...prev, ...saved }));
        toast.success('Profil enregistré avec succès.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save company profile.');
    } finally {
      setSaving(false);
    }
  };

  const cardClass = isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white';
  const inputClass = isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Building2 className="w-7 h-7 text-blue-600" />
        <div>
          <h1
            className={`text-2xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
          >
            {createMode
              ? 'Nouvelle entreprise'
              : form.company_name || 'Mon Entreprise'}
          </h1>
          <p
            className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
          >
            Informations légales et paramètres de facturation
          </p>
        </div>
      </div>

      {isOnboarding && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 rounded-lg px-4 py-3 text-sm dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400">
          Bienvenue ! Veuillez configurer votre profil d'entreprise avant de
          continuer.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identity */}
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-base">
              Identité de l'entreprise
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Raison sociale *" id="company_name">
              <Input
                id="company_name"
                value={form.company_name}
                onChange={set('company_name')}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Forme juridique" id="legal_form">
              <select
                id="legal_form"
                value={form.legal_form}
                onChange={set('legal_form')}
                className={`flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-input'}`}
              >
                <option value="">— Sélectionner —</option>
                {LEGAL_FORMS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Capital social" id="capital">
              <Input
                id="capital"
                value={form.capital}
                onChange={set('capital')}
                placeholder="ex: 100 000 DHS"
                className={inputClass}
              />
            </Field>
            <Field label="ICE *" id="ice">
              <Input
                id="ice"
                value={form.ice}
                onChange={set('ice')}
                placeholder="15 chiffres"
                required
                className={inputClass}
              />
            </Field>
            <Field label="Identifiant Fiscal (IF)" id="identifiant_fiscal">
              <Input
                id="identifiant_fiscal"
                value={form.identifiant_fiscal}
                onChange={set('identifiant_fiscal')}
                className={inputClass}
              />
            </Field>
            <Field label="Registre de Commerce (RC)" id="rc">
              <Input
                id="rc"
                value={form.rc}
                onChange={set('rc')}
                className={inputClass}
              />
            </Field>
            <Field label="Patente" id="patente">
              <Input
                id="patente"
                value={form.patente}
                onChange={set('patente')}
                className={inputClass}
              />
            </Field>
            <Field label="CNSS" id="cnss">
              <Input
                id="cnss"
                value={form.cnss}
                onChange={set('cnss')}
                className={inputClass}
              />
            </Field>
          </CardContent>
        </Card>

        {/* Address & Contact */}
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-base">Adresse & Contact</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Adresse *" id="address">
                <Input
                  id="address"
                  value={form.address}
                  onChange={set('address')}
                  required
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="Ville *" id="city">
              <Input
                id="city"
                value={form.city}
                onChange={set('city')}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Code postal" id="postal_code">
              <Input
                id="postal_code"
                value={form.postal_code}
                onChange={set('postal_code')}
                className={inputClass}
              />
            </Field>
            <Field label="Téléphone" id="phone">
              <Input
                id="phone"
                value={form.phone}
                onChange={set('phone')}
                type="tel"
                className={inputClass}
              />
            </Field>
            <Field label="Email" id="email">
              <Input
                id="email"
                value={form.email}
                onChange={set('email')}
                type="email"
                className={inputClass}
              />
            </Field>
          </CardContent>
        </Card>

        {/* Bank */}
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-base">Coordonnées bancaires</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Banque" id="bank_name">
              <Input
                id="bank_name"
                value={form.bank_name}
                onChange={set('bank_name')}
                className={inputClass}
              />
            </Field>
            <Field label="RIB" id="bank_account">
              <Input
                id="bank_account"
                value={form.bank_account}
                onChange={set('bank_account')}
                className={inputClass}
              />
            </Field>
          </CardContent>
        </Card>

        {/* PDF Personalization */}
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Palette className="w-4 h-4 text-blue-500" />
              Personnalisation PDF
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="URL du logo" id="logo_url">
              <Input
                id="logo_url"
                value={form.logo_url}
                onChange={set('logo_url')}
                placeholder="https://..."
                className={inputClass}
              />
            </Field>
            <Field label="Couleur principale" id="primary_color">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  id="primary_color"
                  value={form.primary_color}
                  onChange={set('primary_color')}
                  className="h-9 w-12 rounded-md border border-input cursor-pointer p-0.5"
                />
                <Input
                  value={form.primary_color}
                  onChange={set('primary_color')}
                  placeholder="#2563EB"
                  className={`font-mono ${inputClass}`}
                />
              </div>
            </Field>
            <div className="md:col-span-2">
              <Field label="Pied de page personnalisé" id="custom_footer">
                <textarea
                  id="custom_footer"
                  value={form.custom_footer}
                  onChange={set('custom_footer')}
                  placeholder="ex: Merci de votre confiance. Pénalité de retard : 1,5% par mois."
                  rows={2}
                  className={`flex w-full rounded-md border px-3 py-2 text-sm shadow-sm resize-none ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-input'}`}
                />
              </Field>
            </div>
            {form.logo_url && (
              <div className="md:col-span-2">
                <p
                  className={`text-xs mb-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}
                >
                  Aperçu du logo :
                </p>
                <img
                  src={form.logo_url}
                  alt="Logo aperçu"
                  className="max-h-16 max-w-48 rounded border border-gray-200 dark:border-gray-600 p-1"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Settings */}
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-base">
              Paramètres de facturation
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Préfixe facture" id="invoice_prefix">
              <Input
                id="invoice_prefix"
                value={form.invoice_prefix}
                onChange={set('invoice_prefix')}
                placeholder="FAC"
                className={inputClass}
              />
            </Field>
            <Field label="TVA par défaut" id="default_tva_rate">
              <select
                id="default_tva_rate"
                value={form.default_tva_rate}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    default_tva_rate: Number(e.target.value),
                  }))
                }
                className={`flex h-9 w-full rounded-md border px-3 py-1 text-sm shadow-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-input'}`}
              >
                {TVA_RATES.map((r) => (
                  <option key={r} value={r}>
                    {r}%
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Devise par défaut" id="default_currency">
              <Input
                id="default_currency"
                value={form.default_currency}
                onChange={set('default_currency')}
                className={inputClass}
              />
            </Field>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card className={cardClass}>
          <CardHeader>
            <CardTitle className="text-base">Catégories de factures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <span
                  key={cat}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${
                    isDarkMode
                      ? 'bg-gray-700 text-gray-200'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {cat}
                  <button
                    type="button"
                    onClick={() =>
                      setCategories((prev) => prev.filter((c) => c !== cat))
                    }
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const trimmed = newCategory.trim();
                    if (trimmed && !categories.includes(trimmed)) {
                      setCategories((prev) => [...prev, trimmed]);
                      setNewCategory('');
                    }
                  }
                }}
                placeholder="Nouvelle catégorie…"
                className={`max-w-xs ${inputClass}`}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const trimmed = newCategory.trim();
                  if (trimmed && !categories.includes(trimmed)) {
                    setCategories((prev) => [...prev, trimmed]);
                    setNewCategory('');
                  }
                }}
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </div>
  );
}
