import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Package, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { calculateItemTotal } from '@/utils/invoiceCalculations';

const TVA_RATES = [0, 7, 10, 14, 20];

function computeItem(name, description, quantity, unit_price, tva) {
  const qty = parseFloat(quantity) || 0;
  const price = parseFloat(unit_price) || 0;
  const rate = parseFloat(tva) || 0;
  const tva_amount = Math.round(qty * price * rate / 100 * 100) / 100;
  const total = parseFloat(calculateItemTotal(qty, price, rate));
  return { name, description, quantity: qty, unit_price: price, tva: rate, tva_amount, total };
}

const InvoiceItems = ({
  items = [],
  currency = 'MAD',
  onItemsChange,
  disabled = false,
  defaultTvaRate = 0,
}) => {
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    tva: defaultTvaRate,
  });
  // Sync TVA in the open form when the default rate changes
  useEffect(() => {
    setNewItem((prev) => ({ ...prev, tva: defaultTvaRate }));
  }, [defaultTvaRate]);

  const [nameError, setNameError] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editingItem, setEditingItem] = useState(null);

  const addItem = () => {
    if (!newItem.name.trim()) {
      setNameError(true);
      return;
    }
    setNameError(false);
    const item = computeItem(
      newItem.name,
      newItem.description,
      newItem.quantity,
      newItem.unit_price,
      newItem.tva,
    );
    onItemsChange([...items, item]);
    setNewItem({ name: '', description: '', quantity: 1, unit_price: 0, tva: defaultTvaRate });
  };

  const removeItem = (index) => {
    onItemsChange(items.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addItem(); }
  };

  const startEdit = (index) => {
    setEditingIndex(index);
    setEditingItem({ ...items[index] });
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingItem(null);
  };

  const handleEditKeyPress = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); confirmEdit(); }
  };

  const confirmEdit = () => {
    if (!editingItem.name.trim()) return;
    const updated = items.map((item, i) =>
      i === editingIndex
        ? computeItem(editingItem.name, editingItem.description, editingItem.quantity, editingItem.unit_price, editingItem.tva)
        : item,
    );
    onItemsChange(updated);
    setEditingIndex(null);
    setEditingItem(null);
  };

  const newTotal = parseFloat(calculateItemTotal(newItem.quantity, newItem.unit_price, newItem.tva)) || 0;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Package className="w-5 h-5" />
        Articles
      </h3>

      {disabled && (
        <p className="text-xs text-amber-700 dark:text-amber-400 italic">
          Articles non modifiables sur une facture validée.
        </p>
      )}

      {/* Add new item form */}
      <Card className={`bg-transparent border-dashed${disabled ? ' opacity-50 pointer-events-none' : ''}`}>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Nom */}
            <div className="grid grid-cols-1 space-y-1">
              <Label>Nom de l&apos;article <span className="text-red-500">*</span></Label>
              <Input
                value={newItem.name}
                onChange={(e) => { setNewItem((p) => ({ ...p, name: e.target.value })); if (nameError) setNameError(false); }}
                onKeyPress={handleKeyPress}
                placeholder="Nom de l'article"
                className={`text-base${nameError ? ' border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {nameError && <p className="text-sm text-red-500">Le nom de l&apos;article est requis.</p>}
            </div>

            {/* Description */}
            <div className="grid grid-cols-1">
              <Input
                value={newItem.description}
                onChange={(e) => setNewItem((p) => ({ ...p, description: e.target.value }))}
                onKeyPress={handleKeyPress}
                placeholder="Description"
                className="text-base"
              />
            </div>

            {/* Quantité, Prix, TVA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Quantité</Label>
                <Input
                  type="number"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem((p) => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                  onKeyPress={handleKeyPress}
                  min="1"
                  className="text-base"
                />
              </div>
              <div className="space-y-1">
                <Label>Prix unitaire HT</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.unit_price}
                  onChange={(e) => setNewItem((p) => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))}
                  onKeyPress={handleKeyPress}
                  placeholder="ex. 100.00"
                  className="text-base"
                />
              </div>
              <div className="space-y-1">
                <Label>TVA (%)</Label>
                <select
                  value={newItem.tva}
                  onChange={(e) => setNewItem((p) => ({ ...p, tva: parseFloat(e.target.value) }))}
                  className="flex h-9 w-full rounded-md border border-input bg-white dark:bg-gray-800 px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                >
                  {TVA_RATES.map((r) => (
                    <option key={r} value={r} className="bg-white dark:bg-gray-800">{r}%</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total TTC:{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {newTotal.toFixed(2)} {currency}
              </span>
            </div>
            <Button
              onClick={addItem}
              type="button"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing items list */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, index) => (
            <Card key={index} className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                {editingIndex === index ? (
                  /* Inline edit form */
                  <div className="space-y-3">
                    <Input
                      value={editingItem.name}
                      onChange={(e) => setEditingItem((p) => ({ ...p, name: e.target.value }))}
                      onKeyPress={handleEditKeyPress}
                      placeholder="Nom de l'article"
                      className="text-sm"
                    />
                    <Input
                      value={editingItem.description}
                      onChange={(e) => setEditingItem((p) => ({ ...p, description: e.target.value }))}
                      onKeyPress={handleEditKeyPress}
                      placeholder="Description"
                      className="text-sm"
                    />
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Quantité</Label>
                        <Input
                          type="number"
                          value={editingItem.quantity}
                          onChange={(e) => setEditingItem((p) => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                          onKeyPress={handleEditKeyPress}
                          min="1"
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Prix unitaire HT</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={editingItem.unit_price}
                          onChange={(e) => setEditingItem((p) => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))}
                          onKeyPress={handleEditKeyPress}
                          className="text-sm"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">TVA (%)</Label>
                        <select
                          value={editingItem.tva ?? defaultTvaRate}
                          onChange={(e) => setEditingItem((p) => ({ ...p, tva: parseFloat(e.target.value) }))}
                          className="flex h-8 w-full rounded-md border border-input bg-white dark:bg-gray-800 px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        >
                          {TVA_RATES.map((r) => (
                            <option key={r} value={r} className="bg-white dark:bg-gray-800">{r}%</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-500">
                        Total TTC:{' '}
                        <span className="font-semibold text-gray-800 dark:text-white">
                          {parseFloat(calculateItemTotal(editingItem.quantity, editingItem.unit_price, editingItem.tva ?? defaultTvaRate)).toFixed(2)} {currency}
                        </span>
                      </span>
                      <div className="flex gap-2">
                        <Button type="button" size="sm" variant="ghost" onClick={cancelEdit} className="text-gray-500 hover:text-gray-700">
                          <X className="w-4 h-4" />
                        </Button>
                        <Button type="button" size="sm" onClick={confirmEdit} className="bg-blue-600 hover:bg-blue-700 text-white">
                          <Check className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Read view */
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="font-medium text-gray-900 dark:text-white text-base">{item.name}</div>
                      {item.description && (
                        <div className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{item.description}</div>
                      )}
                      <div className="text-sm text-gray-500 dark:text-gray-500 flex items-center gap-2 flex-wrap">
                        <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">Qty: {item.quantity}</span>
                        <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">PU HT: {item.unit_price} {currency}</span>
                        <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-1 rounded text-xs font-medium">
                          TVA {item.tva ?? 0}%
                        </span>
                        <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs font-medium">
                          TTC: {parseFloat(item.total || 0).toFixed(2)} {currency}
                        </span>
                      </div>
                    </div>
                    {!disabled && (
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEdit(index)}
                          className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default InvoiceItems;
