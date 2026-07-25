import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getExchangeRate } from '@/api/invoice';
import {
  CalendarDays,
  RefreshCw,
  AlertTriangle,
  WifiOff,
  Download,
} from 'lucide-react';

/**
 * ExportRatesModal
 *
 * Props:
 *   open       – boolean
 *   invoices   – array of invoice objects currently loaded (invoiceData.data)
 *   onExport   – async fn({ date, rates }) → void  (called when user clicks "Exporter")
 *   onCancel   – fn()
 *   loading    – boolean (export in progress)
 */
const ExportRatesModal = ({
  open,
  invoices = [],
  onExport,
  onCancel,
  loading,
}) => {
  const today = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(today);
  const [rates, setRates] = useState({});
  const [fetchStatus, setFetchStatus] = useState('idle'); // idle | loading | success | error
  const [rateNote, setRateNote] = useState(null);

  // Derive the distinct non-MAD currencies present in the current invoice list
  const currencies = [
    ...new Set(
      (invoices || [])
        .map((inv) => inv.currency)
        .filter((c) => c && c !== 'MAD'),
    ),
  ].sort();

  // Auto-fetch rates whenever date or currencies change
  useEffect(() => {
    if (!open || currencies.length === 0) return;
    if (!date) return;

    const fetchRates = async () => {
      setFetchStatus('loading');
      setRateNote(null);
      try {
        const data = await getExchangeRate(date);
        if (data && data.rates) {
          const newRates = {};
          currencies.forEach((c) => {
            if (data.rates[c]) newRates[c] = data.rates[c];
          });
          setRates(newRates);
          setFetchStatus('success');
          setTimeout(() => setFetchStatus('idle'), 2000);

          if (data.is_fallback) {
            setRateNote({
              type: 'unavailable',
              date: data.date?.split('T')[0],
            });
          } else {
            const returned = data.date?.split('T')[0];
            if (returned && returned !== date) {
              setRateNote({ type: 'weekend', date: returned });
            } else {
              setRateNote({ type: 'normal', date: returned });
            }
          }
        }
      } catch {
        setFetchStatus('error');
        setRateNote({ type: 'error' });
      }
    };

    const timer = setTimeout(fetchRates, 400);
    return () => clearTimeout(timer);
  }, [date, open, invoices]);

  const handleRateChange = (currency, value) => {
    setRates((prev) => ({ ...prev, [currency]: parseFloat(value) || 0 }));
  };

  const handleExport = () => {
    onExport({ date, rates });
  };

  const noCurrencies = currencies.length === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="!max-w-lg w-full">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            Exporter les factures
          </DialogTitle>
          <DialogDescription>
            {noCurrencies
              ? 'Toutes les factures sont en MAD. Aucun taux de change requis.'
              : 'Choisissez une date de référence pour les taux de change. Vous pouvez ajuster les taux manuellement.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Date picker */}
          <div className="space-y-1.5">
            <Label
              htmlFor="export-date"
              className="flex items-center gap-2 text-sm font-medium"
            >
              <CalendarDays className="w-4 h-4 text-gray-500" />
              Date de référence des taux
            </Label>
            <Input
              id="export-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={today}
            />
            {/* Rate note */}
            {rateNote?.type === 'normal' && (
              <p className="flex items-center gap-1 text-xs text-gray-400">
                <CalendarDays className="w-3 h-3" /> Taux officiels du{' '}
                {rateNote.date}
              </p>
            )}
            {rateNote?.type === 'weekend' && (
              <p className="flex items-center gap-1 text-xs text-amber-500">
                <AlertTriangle className="w-3 h-3" /> Week-end — taux du{' '}
                {rateNote.date} appliqués
              </p>
            )}
            {rateNote?.type === 'unavailable' && (
              <p className="flex items-center gap-1 text-xs text-amber-500">
                <AlertTriangle className="w-3 h-3" /> Taux de la BAM
                indisponibles pour cette date
                {rateNote.date ? ` — taux du ${rateNote.date} appliqués` : ''}
              </p>
            )}
            {rateNote?.type === 'error' && (
              <p className="flex items-center gap-1 text-xs text-red-500">
                <WifiOff className="w-3 h-3" /> Impossible de récupérer les taux
              </p>
            )}
          </div>

          {/* Rate fields — one per non-MAD currency */}
          {!noCurrencies && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Taux de change (1 devise = X MAD)
                </Label>
                {fetchStatus === 'loading' && (
                  <span className="flex items-center gap-1 text-xs text-blue-500 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />{' '}
                    Actualisation…
                  </span>
                )}
                {fetchStatus === 'success' && (
                  <span className="text-xs text-green-500">✓ Actualisé</span>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
                {currencies.map((currency) => (
                  <div
                    key={currency}
                    className="flex items-center gap-4 px-4 py-3"
                  >
                    <span className="w-12 font-mono text-sm font-bold text-gray-700 dark:text-gray-300">
                      {currency}
                    </span>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-xs text-gray-400">
                        1 {currency} =
                      </span>
                      <Input
                        type="number"
                        min="0"
                        step="0.00001"
                        value={rates[currency] ?? ''}
                        onChange={(e) =>
                          handleRateChange(currency, e.target.value)
                        }
                        placeholder="0.00000"
                        className="h-8 text-sm"
                        disabled={fetchStatus === 'loading'}
                      />
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        MAD
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-gray-400">
                Ces taux seront utilisés pour calculer la colonne{' '}
                <strong>Total MAD</strong> dans le fichier Excel.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleExport} disabled={loading} className="gap-2">
            <Download className="w-4 h-4" />
            {loading ? 'Export en cours…' : 'Exporter'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportRatesModal;
