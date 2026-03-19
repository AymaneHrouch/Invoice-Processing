import { useState } from 'react';
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
import { FormField } from '@/components/ui/form-field';
import SupplierCombobox from '@/components/ui/SupplierCombobox';
import TvaRateField from '@/components/ui/TvaRateField';
import { InvoiceItems, AmountWarningBanner } from '@/components/invoice';
import { runAmountChecks } from '@/utils/invoiceCalculations';

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
    category: '',
    items: [],
    source_type: 'manual',
    status: 'extracted',
    direction,
  });

  const [errors, setErrors] = useState({});

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

  // ✅ Fonction pour mettre à jour les items
  const updateItems = (items) => {
    const processedItems = items.map((item) => ({
      name: item.name || '',
      description: item.description || '',
      quantity: Number(item.quantity) || 1,
      unit_price: Number(item.unit_price) || 0,
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
    if (!formData.total_amount || parseFloat(formData.total_amount) <= 0) {
      newErrors.total_amount = 'Le montant doit être supérieur à 0 !';
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

    // Préparer les données pour l'envoi
    const invoiceData = {
      ...formData,
      total_amount: parseFloat(formData.total_amount),
      invoice_date: formData.invoice_date?.trim() || null,
      invoice_due_date: formData.invoice_due_date?.trim() || null,
      ice: formData.ice?.trim() || null,
      tva:
        formData.tva !== '' && formData.tva != null
          ? parseFloat(formData.tva)
          : null,
      amount_tva:
        formData.amount_tva !== '' && formData.amount_tva != null
          ? parseFloat(formData.amount_tva)
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
            />
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Montant TVA
              </label>
              <div
                className={`flex items-center h-10 px-3 rounded-md border text-sm ${isDarkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-50 border-gray-200 text-gray-700'}`}
              >
                {(() => {
                  const ht = parseFloat(formData.total_amount) || 0;
                  const rate = parseFloat(formData.tva) || 0;
                  const amt =
                    ht > 0 && rate > 0 ? ((ht * rate) / 100).toFixed(2) : null;
                  return amt ? (
                    `${amt} ${formData.currency}`
                  ) : (
                    <span className="text-gray-400">—</span>
                  );
                })()}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 italic">
                HT × TVA%
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
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
              required
            />
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
