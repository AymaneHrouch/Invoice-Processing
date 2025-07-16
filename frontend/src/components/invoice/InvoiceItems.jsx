import React, { useState } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { calculateItemTotal } from '@/constants';

const InvoiceItems = ({ items = [], currency = 'MAD', onItemsChange }) => {
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
      const updatedItems = [...items, item];
      onItemsChange(updatedItems);
      setNewItem({
        description: '',
        quantity: 1,
        unit_price: 0,
        total: 0
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Input
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                onKeyPress={handleKeyPress}
                placeholder="Item description"
              />
            </div>
            <Input
              type="number"
              value={newItem.quantity}
              onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
              placeholder="Quantity"
              min="1"
            />
            <Input
              type="number"
              step="0.01"
              value={newItem.unit_price}
              onChange={(e) => setNewItem(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
              placeholder="Unit price"
            />
          </div>
          <div className="flex justify-between items-center mt-4">
            <div className="text-sm">
              Total: <span className="font-semibold">
                {calculateItemTotal(newItem.quantity, newItem.unit_price)} {currency}
              </span>
            </div>
            <Button onClick={addItem} type="button" className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Existing items list */}
      {items.length > 0 && (
        <div className="space-y-2">
          {items.map((item, index) => (
            <Card key={index} className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium">{item.description}</div>
                    <div className="text-sm">
                      {item.quantity} × {item.unit_price} = {item.total} {currency}
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
      )}
    </div>
  );
};

export default InvoiceItems; 