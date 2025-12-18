import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogFooter,
    DialogTitle,
    DialogDescription,
    DialogClose,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
    loading?: boolean;

    onAfterClose?: () => void; // NUEVO (opcional)
}

export default function FinalizarConteoDialog({
                                                  open,
                                                  onOpenChange,
                                                  onConfirm,
                                                  loading,
                                                  onAfterClose,
                                              }: Props) {
    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                onOpenChange(v);
                if (!v) onAfterClose?.();
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>¿Finalizar este conteo?</DialogTitle>
                    <DialogDescription>Quedará en solo lectura.</DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" disabled={loading}>
                            Cancelar
                        </Button>
                    </DialogClose>

                    <Button onClick={onConfirm} disabled={loading}>
                        {loading ? "Finalizando..." : "Finalizar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
