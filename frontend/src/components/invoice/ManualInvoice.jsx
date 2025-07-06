import React, { useState } from 'react';
import { toast } from 'sonner';

import { 
  Plus, X, Save, Trash2, DollarSign, Hash, 
  Building, Tag, CalendarDays, Package
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { calculateItemTotal, categories, currencies } from '@/constants';
import { useTheme } from '@/contexts';
import { useAddInvoice } from '@/hooks/useAddInvoice';

const ManualInvoice = () => {
  const { isDarkMode } = useTheme();
  const { addInvoice, loading, error, success, message, reset } = useAddInvoice();
  const [newTag, setNewTag] = useState('');
  const [formData, setFormData] = useState({
    vendor_name: '',
    invoice_date: '',
    total_amount: '',
    currency: 'MAD',
    invoice_number: '',
    category: '',
    items: [],
    tags: [],
    source_type: 'manual'
  });

  const [newItem, setNewItem] = useState({
    description: '',
    quantity: 1,
    unit_price: 0,
    total: 0
  });

  const addItem = () => {
    if (newItem.description.trim()) {
      const total = calculateItemTotal(newItem.quantity, newItem.unit_price);
      const item = { ...newItem, total: parseFloat(total) };
      setFormData(prev => ({
        ...prev,
        items: [...prev.items, item]
      }));
      setNewItem({
        description: '',
        quantity: 1,
        unit_price: 0,
        total: 0
      });
    }
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeItem = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const removeTag = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validation simple
    if (!formData.vendor_name || !formData.total_amount || !formData.category) {
      toast.error("Merci de remplir les champs obligatoires : fournisseur, montant, catégorie.");
      return;
    }
    
    // Préparer les données pour l'API
    const invoiceData = {
      ...formData,
      total_amount: parseFloat(formData.total_amount),
      source_type: 'manual',
      invoice_date: formData.invoice_date || null
    };
    
    const result = await addInvoice(invoiceData);
    if (result) {
      toast.success(message || "Facture ajoutée avec succès !");
      setFormData({
        vendor_name: '',
        invoice_date: '',
        total_amount: '',
        currency: 'MAD',
        invoice_number: '',
        category: '',
        items: [],
        tags: [],
        source_type: 'manual'
      });
      reset();
    } else if (error) {
      toast.error(error);
      reset();
    }
  };

  return (
    <TabsContent value="manual" className="space-y-6">
      <Card className={`border-0 shadow-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-white/80'} backdrop-blur-sm`}>
        <CardHeader className="pb-6">
          <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <Building className="w-5 h-5 text-blue-600" />
            Informations de la facture
          </CardTitle>
          <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Saisissez les détails de votre facture manuellement
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Form fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="vendor_name" className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <Building className="w-4 h-4" />
                Fournisseur
              </Label>
              <Input
                id="vendor_name"
                value={formData.vendor_name}
                onChange={(e) => setFormData(prev => ({ ...prev, vendor_name: e.target.value }))}
                placeholder="Nom du fournisseur"
                className={`h-11 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="invoice_number" className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <Hash className="w-4 h-4" />
                Numéro
              </Label>
              <Input
                id="invoice_number"
                value={formData.invoice_number}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                placeholder="INV-2024-001"
                className={`h-11 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label htmlFor="total_amount" className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <DollarSign className="w-4 h-4" />
                Montant
              </Label>
              <Input
                id="total_amount"
                type="number"
                step="0.01"
                value={formData.total_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, total_amount: e.target.value }))}
                placeholder="0.00"
                className={`h-11 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
              />
            </div>
            
            <div className="space-y-2">
              <Label className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Devise</Label>
              <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                <SelectTrigger className={`h-11 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map(currency => (
                    <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="invoice_date" className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <CalendarDays className="w-4 h-4" />
                Date
              </Label>
              <Input
                id="invoice_date"
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                className={`h-11 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
              />
            </div>
            
            <div className="space-y-2">
              <Label className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <Package className="w-4 h-4" />
                Catégorie
              </Label>
              <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                <SelectTrigger className={`h-11 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}>
                  <SelectValue placeholder="Sélectionner une catégorie" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />

          {/* Articles Section */}
          <div className="space-y-4">
            <h3 className={`text-lg font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <Package className="w-5 h-5" />
              Articles
            </h3>
            
            <Card className={`${isDarkMode ? 'bg-gray-700/30' : 'bg-gray-50'} border-dashed`}>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <Input
                      value={newItem.description}
                      onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Description de l'article"
                      className={`h-10 ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white'}`}
                    />
                  </div>
                  <Input
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    placeholder="Quantité"
                    min="1"
                    className={`h-10 ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white'}`}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    value={newItem.unit_price}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                    placeholder="Prix unitaire"
                    className={`h-10 ${isDarkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white'}`}
                  />
                </div>
                <div className="flex justify-between items-center mt-4">
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Total: <span className="font-semibold">{calculateItemTotal(newItem.quantity, newItem.unit_price)} {formData.currency}</span>
                  </div>
                  <Button onClick={addItem} className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </Button>
                </div>
              </CardContent>
            </Card>

            {formData.items.length > 0 && (
              <div className="space-y-2">
                {formData.items.map((item, index) => (
                  <Card key={index} className={`border-l-4 border-l-blue-500 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{item.description}</div>
                          <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                            {item.quantity} × {item.unit_price} = {item.total} {formData.currency}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />

          {/* Tags Section */}
          <div className="space-y-4">
            <Label className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              <Tag className="w-4 h-4" />
              Tags
            </Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Ajouter un tag"
                className={`flex-1 h-10 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
              />
              <Button onClick={addTag} variant="outline" className="px-4">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                    {tag}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTag(tag)}
                      className="h-auto p-0 ml-1 hover:bg-transparent cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>
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
  )
}

export default ManualInvoice