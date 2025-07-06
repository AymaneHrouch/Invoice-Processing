import { useState } from 'react';

import { 
  Upload, X, FileText, Eye, Save, Trash2, DollarSign, Hash,
  Building, Tag, CalendarDays, Package, Sparkles, Check
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { categories, currencies } from '@/constants';
import { useTheme } from '@/contexts';
import { useAddInvoice } from '@/hooks/useAddInvoice';

const AutoInvoice = () => {
  const { isDarkMode } = useTheme();
  const { addInvoice, loading, error, success, message, reset } = useAddInvoice();
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState({
    supplier: '',
    date: '',
    amount: '',
    currency: 'EUR',
    invoice_number: '',
    category: '',
    items: [],
    tags: []
  });

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
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
  
  // TODO hook
  const handleFileUpload = (file) => {
    setUploadedFile(file);
    setIsProcessing(true);
    
    // Simulate AI processing
    setTimeout(() => {
      const extractedData = {
        supplier: 'Tech Solutions Inc.',
        date: '2024-12-15',
        amount: '1250.00',
        currency: 'EUR',
        invoice_number: 'INV-2024-001',
        category: 'Services',
        items: [
          {
            description: 'Web Development Services',
            quantity: 40,
            unit_price: 25.00,
            total: 1000.00
          },
          {
            description: 'Project Management',
            quantity: 10,
            unit_price: 25.00,
            total: 250.00
          }
        ],
        tags: ['Web', 'Development', 'Q4']
      };
      
      setFormData(extractedData);
      setIsProcessing(false);
    }, 2000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Validation simple
    if (!formData.supplier || !formData.amount || !formData.date) {
      alert("Merci de remplir les champs obligatoires : fournisseur, montant, date.");
      return;
    }
    const result = await addInvoice(formData);
    if (result) {
      // Reset du formulaire après succès
      setFormData({
        supplier: '',
        date: '',
        amount: '',
        currency: 'EUR',
        invoice_number: '',
        category: '',
        items: [],
        tags: []
      });
      setUploadedFile(null);
    }
  };

  return (
    <TabsContent value="file" className="space-y-6">
      <Card className={`border-0 shadow-lg ${isDarkMode ? 'bg-gray-700/50' : 'bg-white/80'} backdrop-blur-sm`}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            <Sparkles className="w-5 h-5 text-purple-600" />
            Intelligence Artificielle
          </CardTitle>
          <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
            Glissez-déposez votre facture et laissez l'IA extraire les données automatiquement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
              dragActive
                ? 'border-blue-500 bg-blue-50/50 scale-105'
                : `${isDarkMode ? 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`
            } cursor-pointer`}
          >
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <div>
                <h3 className={`text-xl font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Glissez-déposez votre facture
                </h3>
                <p className={`text-sm mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Formats supportés: PDF, PNG, JPG, JPEG
                </p>
              </div>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  onClick={() => document.getElementById('file-input').click()}
                  className={`${isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-50'}`}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Choisir un fichier
                </Button>
                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => e.target.files[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {uploadedFile && (
            <div className="mt-6">
              <Alert className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-blue-50 border-blue-200'}`}>
                <FileText className="w-4 h-4" />
                <AlertDescription className={isDarkMode ? 'text-gray-300' : 'text-blue-800'}>
                  <strong>Fichier sélectionné:</strong> {uploadedFile.name}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {isProcessing && (
            <div className="mt-6 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className={`mt-4 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Traitement en cours par l'IA...
                </p>
              </div>
            </div>
          )}

          {formData.supplier && !isProcessing && (
            <div className="mt-6">
              <Alert className={`${isDarkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'}`}>
                <Check className="w-4 h-4 text-green-600" />
                <AlertDescription className={isDarkMode ? 'text-green-300' : 'text-green-800'}>
                  <strong>Données extraites avec succès!</strong> Vous pouvez maintenant réviser et modifier les informations ci-dessous.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {success && (
            <Alert className={isDarkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'}>
              <Check className="w-4 h-4 text-green-600" />
              <AlertDescription className={isDarkMode ? 'text-green-300' : 'text-green-800'}>
                {message}
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert className={isDarkMode ? 'bg-red-900/20 border-red-700' : 'bg-red-50 border-red-200'}>
              <X className="w-4 h-4 text-red-600" />
              <AlertDescription className={isDarkMode ? 'text-red-300' : 'text-red-800'}>
                {error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Extracted Data Form */}
      {formData.supplier && !isProcessing && (
        <Card className={`border-0 shadow-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-white/80'} backdrop-blur-sm`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              <Eye className="w-5 h-5 text-green-600" />
              Données extraites
            </CardTitle>
            <CardDescription className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              Vérifiez et modifiez les informations extraites si nécessaire
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Same form fields as manual tab */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="ai-supplier" className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Building className="w-4 h-4" />
                  Fournisseur
                </Label>
                <Input
                  id="ai-supplier"
                  value={formData.supplier}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                  className={`h-11 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="ai-invoice-number" className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Hash className="w-4 h-4" />
                  Numéro
                </Label>
                <Input
                  id="ai-invoice-number"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                  className={`h-11 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="ai-amount" className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <DollarSign className="w-4 h-4" />
                  Montant
                </Label>
                <Input
                  id="ai-amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  className={`h-11 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
                />
              </div>
              
              <div className="space-y-2">
                <Label className={isDarkMode ? 'text-gray-300' : 'text-gray-700'}>Devise</Label>
                <Select value={formData.currency} onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}>
                  <SelectTrigger className={`w-full ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}>
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
                <Label htmlFor="ai-date" className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <CalendarDays className="w-4 h-4" />
                  Date
                </Label>
                <Input
                  id="ai-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  className={`h-11 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}
                />
              </div>

              <div className="space-y-2">
                <Label className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Package className="w-4 h-4" />
                  Catégorie
                </Label>
                <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger className={`w-full ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white'}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(category => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Articles Section */}
            {formData.items.length > 0 && (
              <div className="space-y-4">
                <h3 className={`text-lg font-semibold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Package className="w-5 h-5" />
                  Articles extraits
                </h3>
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <Card key={index} className={`border-l-4 border-l-green-500 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
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
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Tags Section */}
            {formData.tags.length > 0 && (
              <div className="space-y-4">
                <Label className={`flex items-center gap-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  <Tag className="w-4 h-4" />
                  Tags extraits
                </Label>
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1 px-3 py-1">
                      {tag}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeTag(tag)}
                        className="h-auto p-0 ml-1 hover:bg-transparent"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {formData.supplier && !isProcessing && (
        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            size="lg"
            className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Save className="w-5 h-5 mr-2" />
            Enregistrer la facture
          </Button>
        </div>
      )}
    </TabsContent>
  )
}

export default AutoInvoice