import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Save, X, Plus, Trash2, DollarSign, Hash, Building, Tag, CalendarDays, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { calculateItemTotal, categories, currencies } from '@/constants';
import { useTheme } from '@/contexts';
import { useEditInvoice } from '@/hooks/useEditInvoice';

const EditInvoice = ({ open, onClose, invoice, onSuccess }) => {
  const { isDarkMode } = useTheme();
  const { editInvoice, loading, error, message, reset } = useEditInvoice();
  const [newTag, setNewTag] = useState('');
  const [formData, setFormData] = useState({ ...invoice });
  const [newItem, setNewItem] = useState({ description: '', quantity: 1, unit_price: 0, total: 0 });

  useEffect(() => {
    if (invoice) {
      setFormData({ ...invoice });
      console.log("Invoice data received:", invoice);
      console.log("Invoice ID:", invoice._id);
    }
  }, [invoice]);

  const addItem = () => {
    if (newItem.description.trim()) {
      const total = calculateItemTotal(newItem.quantity, newItem.unit_price);
      const item = { ...newItem, total: parseFloat(total) };
      setFormData(prev => ({ ...prev, items: [...prev.items, item] }));
      setNewItem({ description: '', quantity: 1, unit_price: 0, total: 0 });
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const removeItem = (index) => {
    setFormData(prev => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.vendor_name || !formData.total_amount || !formData.category) {
      toast.error("Merci de remplir les champs obligatoires : fournisseur, montant, catégorie.");
      return;
    }
    
    console.log("Submitting invoice with ID:", formData._id);
    console.log("Form data:", formData);
    
    const invoiceData = {
      ...formData,
      total_amount: parseFloat(formData.total_amount),
      invoice_date: formData.invoice_date || null
    };
    const result = await editInvoice(formData._id, invoiceData);
    if (result) {
      toast.success(message || "Facture modifiée avec succès !");
      reset();
      if (onSuccess) onSuccess();
      onClose();
    } else if (error) {
      toast.error(error);
      reset();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div className={`h-[80%] w-full max-w-2xl bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 relative overflow-y-auto`}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 dark:hover:text-white">
          <X className="w-6 h-6" />
        </button>
        <form onSubmit={handleSubmit}>
          <Card className={`border-0 shadow-none bg-transparent`}> 
            <CardHeader className="pb-6">
              <CardTitle className={`flex items-center gap-2 text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Modifier la Facture</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="vendor_name">Fournisseur</Label>
                  <Input id="vendor_name" value={formData.vendor_name} onChange={e => setFormData(prev => ({ ...prev, vendor_name: e.target.value }))} placeholder="Nom du fournisseur" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_number">Numéro</Label>
                  <Input id="invoice_number" value={formData.invoice_number} onChange={e => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))} placeholder="INV-2024-001" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="total_amount">Montant</Label>
                  <Input id="total_amount" type="number" step="0.01" value={formData.total_amount} onChange={e => setFormData(prev => ({ ...prev, total_amount: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="space-y-2">
                  <Label>Devise</Label>
                  <Select value={formData.currency} onValueChange={value => setFormData(prev => ({ ...prev, currency: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {currencies.map(currency => (
                        <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invoice_date">Date</Label>
                  <Input id="invoice_date" type="date" value={formData.invoice_date} onChange={e => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Catégorie</Label>
                  <Select value={formData.category} onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner une catégorie" /></SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator />
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Articles</h3>
                <Card className="bg-transparent border-dashed">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2">
                        <Input value={newItem.description} onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))} placeholder="Description de l'article" />
                      </div>
                      <Input type="number" value={newItem.quantity} onChange={e => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))} placeholder="Quantité" min="1" />
                      <Input type="number" step="0.01" value={newItem.unit_price} onChange={e => setNewItem(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))} placeholder="Prix unitaire" />
                    </div>
                    <div className="flex justify-between items-center mt-4">
                      <div className="text-sm">Total: <span className="font-semibold">{calculateItemTotal(newItem.quantity, newItem.unit_price)} {formData.currency}</span></div>
                      <Button onClick={addItem} type="button" className="flex items-center gap-2"><Plus className="w-4 h-4" />Ajouter</Button>
                    </div>
                  </CardContent>
                </Card>
                {formData.items && formData.items.length > 0 && (
                  <div className="space-y-2">
                    {formData.items.map((item, index) => (
                      <Card key={index} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium">{item.description}</div>
                              <div className="text-sm">{item.quantity} × {item.unit_price} = {item.total} {formData.currency}</div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"><Trash2 className="w-4 h-4" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              <Separator />
              <div className="space-y-4">
                <Label>Tags</Label>
                <div className="flex gap-2">
                  <Input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Ajouter un tag" />
                  <Button onClick={addTag} variant="outline" type="button" className="px-4"><Plus className="w-4 h-4" /></Button>
                </div>
                {formData.tags && formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="flex items-center gap-1 px-3 py-1">{tag}<Button variant="ghost" size="sm" onClick={() => removeTag(tag)} className="h-auto p-0 ml-1 hover:bg-transparent cursor-pointer"><X className="w-3 h-3" /></Button></Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-end mt-6">
            <Button type="submit" size="lg" className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200" disabled={loading}>
              <Save className="w-5 h-5 mr-2" />
              {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditInvoice; 