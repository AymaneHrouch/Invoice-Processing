import { useState, useEffect } from 'react';
import {
  Save,
  Building,
  Hash,
  DollarSign,
  CircleDollarSign,
  CalendarDays,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { currencies } from '@/constants';
import { useTheme } from '@/contexts';
import { useAddInvoice } from '@/hooks/useAddInvoice';
import { useCategories } from '@/hooks/useCategories';
import { getExchangeRate } from '@/api/invoice';
import { FormField } from '@/components/ui/form-field';
import SupplierCombobox from '@/components/ui/SupplierCombobox';
import TvaRateField from '@/components/ui/TvaRateField';
import { InvoiceItems, AmountWarningBanner } from '@/components/invoice';
import {
  runAmountChecks,
  calculateInvoiceTotals,
} from '@/utils/invoiceCalculations';

// ✅ Fonction utilitaire pour formater les dates
const formatDateForInput = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) return date.toISOString().split('T')[0];
    return '';
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

const ManualInvoice = ({ direction = 'incoming' }) => {
  const { isDarkMode } = useTheme();
  const { addInvoice, loading, error, success, message, reset } =
    useAddInvoice();
  const { categories } = useCategories();

  // ✅ État local direct
  const [formData, setFormData] = useState({
    vendor_name: '',
    contact_id: null,
    invoice_number: '',
    ice: '',
    tva: '',
    amount_tva: '',
    invoice_date: formatDateForInput(new Date()),
    invoice_due_date: '',
    total_amount: '',
    currency: 'MAD',
    exchange_rate: 1,
    category: '',
    items: [],
    source_type: 'manual',
    status: 'extracted',
    direction,
  });

  const [errors, setErrors] = useState({});
  const [rateStatus, setRateStatus] = useState('idle');

  useEffect(() => {
    if (formData.currency === 'MAD') {
      setFormData((prev) => ({ ...prev, exchange_rate: 1 }));
      return;
    }

    if (formData.invoice_date) {
      const fetchRate = async () => {
        try {
          setRateStatus('loading');
          const data = await getExchangeRate(formData.invoice_date);
          if (data && data.rates && data.rates[formData.currency]) {
            setFormData((prev) => ({
              ...prev,
              exchange_rate: data.rates[formData.currency],
            }));
            setRateStatus('success');
            setTimeout(() => setRateStatus('idle'), 2000);
          } else {
            setRateStatus('idle');
          }
        } catch (err) {
          setRateStatus('idle');
          toast.error(
            'Impossible de récupérer le taux de change pour cette date.',
          );
        }
      };
      const timeoutId = setTimeout(fetchRate, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.currency, formData.invoice_date]);

  // ✅ Fonction pour mettre à jour un champ
  const updateField = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Supprimer l'erreur pour ce champ
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // ✅ Fonction pour mettre à jour les items (preserve per-item tva/tva_amount)
  const updateItems = (items) => {
    const processedItems = items.map((item) => ({
      name: item.name || '',
      description: item.description || '',
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
      tva: Number(item.tva) || 0,
      tva_amount: Number(item.tva_amount) || 0,
      total: Number(item.total) || 0,
    }));

    setFormData((prev) => ({
      ...prev,
      items: processedItems,
    }));
  };

  // ✅ Validation du formulaire
  const validateForm = () => {
    const newErrors = {};

    if (!formData.vendor_name?.trim()) {
      newErrors.vendor_name = 'Le nom du fournisseur est requis !';
    }
    if (!formData.invoice_number?.trim()) {
      newErrors.invoice_number = 'Le numéro de facture est requis !';
    }
    if (!formData.category?.trim()) {
      newErrors.category = 'La catégorie est requise !';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ✅ Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      vendor_name: '',
      contact_id: null,
      invoice_number: '',
      ice: '',
      tva: '',
      amount_tva: '',
      invoice_date: formatDateForInput(new Date()),
      invoice_due_date: '',
      total_amount: '',
      currency: 'MAD',
      exchange_rate: 1,
      category: '',
      items: [],
      source_type: 'manual',
      status: 'extracted',
    });
    setErrors({});
  };

  // ✅ Soumission du formulaire
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Veuillez corriger les erreurs dans le formulaire.');
      return;
    }

    // Compute totals from items when present; otherwise fall back to manual field (or 0)
    let subtotal_ht = null;
    let amount_tva = null;
    let total_amount;
    if (formData.items.length > 0) {
      const totals = calculateInvoiceTotals(formData.items);
      subtotal_ht = totals.subtotalHT;
      amount_tva = totals.amountTva;
      total_amount = totals.totalTTC;
    } else {
      total_amount =
        formData.total_amount !== '' ? parseFloat(formData.total_amount) : null;
    }

    // Préparer les données pour l'envoi
    const invoiceData = {
      ...formData,
      total_amount,
      subtotal_ht,
      amount_tva,
      invoice_date: formData.invoice_date?.trim() || null,
      invoice_due_date: formData.invoice_due_date?.trim() || null,
      ice: formData.ice?.trim() || null,
      tva:
        formData.tva !== '' && formData.tva != null
          ? parseFloat(formData.tva)
          : null,
    };

    const result = await addInvoice(invoiceData);

    if (result) {
      toast.success(message || 'Facture ajoutée avec succès !');
      resetForm();
      reset();
    } else if (error) {
      toast.error(error);
      reset();
    }
  };

  return (
    <TabsContent value="manual" className="space-y-6">
      <Card
        className={`border-0 shadow-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-white/80'} backdrop-blur-sm pt-0 overflow-hidden`}
      >
        <CardHeader className="py-6 bg-gradient-to-r from-blue-500/30 via-indigo-500/20 to-blue-700/10">
          <CardTitle
            className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}
          >
            <Building className="w-5 h-5 text-blue-600" />
            Informations de la facture
          </CardTitle>
          <CardDescription
            className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}
          >
            Saisissez les détails de votre facture manuellement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {(() => {
            // Only check amounts when the user has explicitly typed a total — if
            // the field is empty it will be auto-computed from items, so comparing
            // "sum vs. 0" would be misleading noise.
            if (formData.total_amount === '') return null;
            const warnings = runAmountChecks(
              { total_amount: formData.total_amount, items: formData.items },
              formData.currency,
            );
            return warnings.length > 0 ? (
              <AmountWarningBanner warnings={warnings} />
            ) : null;
          })()}
          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SupplierCombobox
              value={formData.vendor_name}
              onChange={(val) => updateField('vendor_name', val)}
              onIceChange={(ice) => updateField('ice', ice)}
              onContactSelect={(c) => updateField('contact_id', c._id || null)}
              error={errors.vendor_name}
              placeholder="Saisir le nom du fournisseur"
              required
            />
            <FormField
              id="invoice_number"
              label="Numéro de facture"
              value={formData.invoice_number}
              onChange={(e) => updateField('invoice_number', e.target.value)}
              placeholder="Saisir le numéro de facture"
              error={errors.invoice_number}
              icon={Hash}
              required
            />
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                ICE
              </label>
              <div
                className={`flex items-center h-10 px-3 rounded-md border text-sm font-mono ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
              >
                {formData.ice || (
                  <span className="text-gray-400 font-sans">—</span>
                )}
              </div>
            </div>
            <TvaRateField
              value={formData.tva}
              onChange={(v) => updateField('tva', v)}
              allowCustom={true}
              isDarkMode={isDarkMode}
              label="TVA par défaut (%)"
            />
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Montant TVA
              </label>
              <div
                className={`flex items-center h-10 px-3 rounded-md border text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
              >
                {(() => {
                  if (formData.items.length > 0) {
                    const { amountTva } = calculateInvoiceTotals(
                      formData.items,
                    );
                    return amountTva > 0 ? (
                      `${amountTva.toFixed(2)} ${formData.currency}`
                    ) : (
                      <span className="text-gray-400">—</span>
                    );
                  }
                  return <span className="text-gray-400">—</span>;
                })()}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                Calculé depuis les articles
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="space-y-1">
              <FormField
                id="total_amount"
                type="number"
                label="Montant"
                value={formData.total_amount}
                onChange={(e) => updateField('total_amount', e.target.value)}
                placeholder="0.00"
                step="0.01"
                error={errors.total_amount}
                icon={DollarSign}
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                {formData.items.length > 0
                  ? `Calculé automatiquement depuis les articles`
                  : `Optionnel — calculé automatiquement si des articles sont ajoutés`}
              </p>
            </div>
            <FormField
              type="select"
              label="Devise"
              value={formData.currency}
              onChange={(value) => updateField('currency', value)}
              options={currencies}
              placeholder="Sélectionner une devise"
              icon={CircleDollarSign}
            />
            <FormField
              id="exchange_rate"
              type="number"
              label={
                <span className="flex items-center gap-2">
                  Taux de change (MAD)
                  {rateStatus === 'loading' && (
                    <span className="text-xs text-blue-500 animate-pulse">
                      (calcul...)
                    </span>
                  )}
                  {rateStatus === 'success' && (
                    <span className="text-xs text-green-500">(actualisé)</span>
                  )}
                </span>
              }
              value={formData.exchange_rate}
              onChange={(e) =>
                updateField('exchange_rate', parseFloat(e.target.value) || 1)
              }
              disabled={formData.currency === 'MAD' || rateStatus === 'loading'}
              step="0.00001"
              className={`w-full transition-all duration-500 ${rateStatus === 'success' ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/20' : ''}`}
            />
            <FormField
              id="invoice_date"
              type="date"
              label="Date"
              value={formData.invoice_date}
              onChange={(e) => updateField('invoice_date', e.target.value)}
            />
            <FormField
              id="invoice_due_date"
              type="date"
              label="Date d'échéance"
              value={formData.invoice_due_date}
              onChange={(e) => updateField('invoice_due_date', e.target.value)}
            />
            <FormField
              type="select"
              label="Catégorie"
              value={formData.category}
              onChange={(value) => updateField('category', value)}
              options={categories}
              placeholder="Sélectionner une catégorie"
              error={errors.category}
              icon={Package}
              required
            />
          </div>

          <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />

          <InvoiceItems
            items={formData.items}
            currency={formData.currency}
            onItemsChange={updateItems}
            defaultTvaRate={parseFloat(formData.tva) || 0}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200"
          disabled={loading}
        >
          <Save className="w-5 h-5 mr-2" />
          {loading ? 'Enregistrement...' : 'Enregistrer la facture'}
        </Button>
      </div>
    </TabsContent>
  );
};

export default ManualInvoice;
