/**
 * SupplierCombobox
 *
 * Combobox for the supplier/vendor field on invoice forms.
 * - Type to search existing supplier contacts
 * - Select one → auto-fills ICE
 * - If no match → "Add as new supplier" option creates the contact on the fly
 */
import { useState, useEffect, useRef } from 'react';
import { Building, Plus, Check } from 'lucide-react';
import { toast } from 'sonner';
import { getContacts, createContact } from '@/api/contacts';
import { Input } from './input';
import { Label } from './label';

const SupplierCombobox = ({
  value = '',
  onChange, // (name: string) => void
  onIceChange, // (ice: string) => void — called when an existing contact is selected
  onContactSelect, // (contact: object) => void — optional, called when a contact is selected
  disabled = false,
  error,
  required = false,
  label = 'Fournisseur',
  placeholder = 'Nom du fournisseur',
  icon: Icon = Building,
  contactType = 'supplier', // 'supplier' | 'client'
}) => {
  const [inputValue, setInputValue] = useState(value);
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [iceInput, setIceInput] = useState('');
  const addingRef = useRef(false);
  const containerRef = useRef(null);

  // Sync external value changes (e.g. when the form resets or loads invoice data)
  useEffect(() => {
    setInputValue(value);
  }, [value]);

  // Fetch matching suppliers whenever input changes
  useEffect(() => {
    if (!inputValue.trim()) {
      setOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await getContacts({
          type: contactType,
          q: inputValue.trim(),
        });
        setOptions(results);
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleInput = (e) => {
    const val = e.target.value;
    setInputValue(val);
    onChange(val);
    setIceInput('');
    setOpen(true);
  };

  const selectContact = (contact) => {
    setInputValue(contact.name);
    onChange(contact.name);
    if (contact.ice && onIceChange) onIceChange(contact.ice);
    if (onContactSelect) onContactSelect(contact);
    setIceInput('');
    setOpen(false);
  };

  const handleAddNew = async () => {
    if (addingRef.current || !inputValue.trim()) return;
    addingRef.current = true;
    setAdding(true);
    try {
      const created = await createContact({
        name: inputValue.trim(),
        ice: iceInput.trim() || undefined,
        contact_type: [contactType],
      });
      toast.success(`"${created.name}" ajouté aux contacts.`);
      window.dispatchEvent(new CustomEvent('contacts:updated'));
      setOptions((prev) => [...prev, created]);
      // Notify parent of selection without closing dropdown — user sees "Contact existant"
      onChange(created.name);
      if (created.ice && onIceChange) onIceChange(created.ice);
      if (onContactSelect) onContactSelect(created);
    } catch {
      toast.error('Impossible de créer le contact.');
    } finally {
      addingRef.current = false;
      setAdding(false);
    }
  };

  // Whether the typed value exactly matches an existing contact name
  const exactMatch = options.some(
    (c) => c.name.toLowerCase() === inputValue.trim().toLowerCase(),
  );

  const showDropdown = open && inputValue.trim().length > 0;

  return (
    <div className="space-y-2" ref={containerRef}>
      <Label
        className={
          required ? 'after:content-["*"] after:ml-0.5 after:text-red-500' : ''
        }
      >
        {label}
      </Label>

      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 z-10 pointer-events-none" />
        )}
        <Input
          value={inputValue}
          onChange={handleInput}
          onFocus={() => !disabled && inputValue.trim() && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className={Icon ? 'pl-10' : ''}
        />

        {showDropdown && (
          <div className="absolute z-50 top-full left-0 mt-1 min-w-[280px] w-max max-w-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden">
            {loading && (
              <div className="px-3 py-2 text-sm text-gray-400">Recherche…</div>
            )}

            {!loading &&
              options.map((contact) => (
                <button
                  key={contact._id}
                  type="button"
                  onMouseDown={() => selectContact(contact)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 text-left cursor-pointer"
                >
                  <span className="font-medium text-gray-800 dark:text-gray-200">
                    {contact.name}
                  </span>
                  <span className="text-xs text-gray-400 font-mono">
                    {contact.ice || ''}
                  </span>
                </button>
              ))}

            {!loading && !exactMatch && (
              <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2 space-y-2">
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" />
                  Créer «&nbsp;{inputValue}&nbsp;» comme{' '}
                  {contactType === 'client' ? 'client' : 'fournisseur'}
                </p>
                <input
                  type="text"
                  value={iceInput}
                  onChange={(e) => setIceInput(e.target.value)}
                  onMouseDown={(e) => e.stopPropagation()}
                  placeholder="ICE (optionnel)"
                  className="w-full text-xs border border-gray-200 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 outline-none focus:border-blue-400"
                />
                <button
                  type="button"
                  onClick={handleAddNew}
                  disabled={adding}
                  className="w-full text-xs px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                >
                  {adding ? '…' : 'Créer'}
                </button>
              </div>
            )}

            {!loading && exactMatch && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-green-600 border-t border-gray-100 dark:border-gray-700">
                <Check className="w-3.5 h-3.5" />
                Contact existant
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};

export default SupplierCombobox;
