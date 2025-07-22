import React, { useState } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { calculateItemTotal } from '@/constants';

const InvoiceItems = ({ items = [], currency = 'MAD', onItemsChange }) => {
  const [newItem, setNewItem] = useState({
    name: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    total: 0,
  });

  const addItem = () => {
    if (newItem.name.trim()) {
      const total = calculateItemTotal(newItem.quantity, newItem.unit_price);
      const item = { ...newItem, total: parseFloat(total) };
      const updatedItems = [...items, item];
      onItemsChange(updatedItems);
      setNewItem({
        name: '',
        description: '',
        quantity: 1,
        unit_price: 0,
        total: 0,
      });
    }
  };

  const removeItem = (index) => {
    const updatedItems = items.filter((_, i) => i !== index);
    onItemsChange(updatedItems);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold flex items-center gap-2">
        <Package className="w-5 h-5" />
        Items
      </h3>

      {/* Add new item form */}
      <Card className="bg-transparent border-dashed">
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Première ligne: Nom de l'item */}
            <div className="grid grid-cols-1">
              <Input
                value={newItem.name}
                onChange={(e) =>
                  setNewItem((prev) => ({ ...prev, name: e.target.value }))
                }
                onKeyPress={handleKeyPress}
                placeholder="Item name"
                className="text-base"
              />
            </div>

            {/* Deuxième ligne: Description complète */}
            <div className="grid grid-cols-1">
              <Input
                value={newItem.description}
                onChange={(e) =>
                  setNewItem((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                onKeyPress={handleKeyPress}
                placeholder="Item description"
                className="text-base"
              />
            </div>

            {/* Troisième ligne: Quantité et Prix unitaire */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                type="number"
                value={newItem.quantity}
                onChange={(e) =>
                  setNewItem((prev) => ({
                    ...prev,
                    quantity: parseInt(e.target.value) || 1,
                  }))
                }
                placeholder="Quantity"
                min="1"
                className="text-base"
              />
              <Input
                type="number"
                step="0.01"
                value={newItem.unit_price}
                onChange={(e) =>
                  setNewItem((prev) => ({
                    ...prev,
                    unit_price: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="Unit price"
                className="text-base"
              />
            </div>
          </div>

          <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total:{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {calculateItemTotal(newItem.quantity, newItem.unit_price)}{' '}
                {currency}
              </span>
            </div>
            <Button
              onClick={addItem}
              type="button"
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="w-4 h-4" />
              Add Item
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing items list */}
      {items.length > 0 && (
        <div className="space-y-3">
          {items.map((item, index) => (
            <Card
              key={index}
              className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow"
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="font-medium text-gray-900 dark:text-white text-base">
                      {item.name}
                    </div>
                    <div className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {item.description}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-500 flex items-center gap-2">
                      <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                        Qty: {item.quantity}
                      </span>
                      <span className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                        Unit: {item.unit_price} {currency}
                      </span>
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded text-xs font-medium">
                        Total: {item.total} {currency}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeItem(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
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
  );
};

export default InvoiceItems;
