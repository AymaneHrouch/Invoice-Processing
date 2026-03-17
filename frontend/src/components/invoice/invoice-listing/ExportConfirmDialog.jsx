import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ExportConfirmDialog = ({ open, count, onConfirm, onCancel }) => {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Marquer comme exportées ?</DialogTitle>
          <DialogDescription>
            {count > 0
              ? `${count} facture${count > 1 ? 's' : ''} ont été téléchargée${count > 1 ? 's' : ''}. Voulez-vous les marquer comme exportées ?`
              : 'Voulez-vous marquer ces factures comme exportées ?'}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            Non, ignorer
          </Button>
          <Button onClick={onConfirm}>Oui, marquer exportées</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportConfirmDialog;
