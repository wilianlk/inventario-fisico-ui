import { forwardRef, useImperativeHandle, useMemo, useState } from "react";
import { toast } from "react-toastify";

import { DetalleConteo, finalizarConteo } from "@/services/conteoService";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type ConteosFinalizarFlowHandle = {
    openConfirm: (detalle: DetalleConteo) => void;
};

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;

    detalles: DetalleConteo[];
    editableDetalle: (d: DetalleConteo) => boolean;
    isManaged: (itemId: number) => boolean;

    finalizandoByConteoId: Record<number, boolean>;
    setFinalizandoByConteoId: (updater: (prev: Record<number, boolean>) => Record<number, boolean>) => void;

    highlightByConteoId: Record<number, boolean>;
    setHighlightByConteoId: (updater: (prev: Record<number, boolean>) => Record<number, boolean>) => void;

    setDetalles: (updater: (prev: DetalleConteo[]) => DetalleConteo[]) => void;

    onAfterClose: () => void;
    onMarkManualIntent: () => void;
}

const ConteosFinalizarFlow = forwardRef<ConteosFinalizarFlowHandle, Props>(function ConteosFinalizarFlow(
    {
        open,
        onOpenChange,
        detalles,
        editableDetalle,
        isManaged,
        finalizandoByConteoId,
        setFinalizandoByConteoId,
        highlightByConteoId,
        setHighlightByConteoId,
        setDetalles,
        onAfterClose,
        onMarkManualIntent,
    },
    ref
) {
    const [confirmDetalle, setConfirmDetalle] = useState<DetalleConteo | null>(null);

    const pendientesDetalle = (detalle: DetalleConteo) => {
        return (detalle.items || []).filter((it) => !isManaged(it.id));
    };

    const openConfirm = (detalle: DetalleConteo) => {
        onMarkManualIntent();

        if (!editableDetalle(detalle)) {
            toast.info("Conteo cerrado. Solo lectura.");
            return;
        }
        if (!detalle.conteoId) return;
        if (finalizandoByConteoId[detalle.conteoId]) return;

        const pendientes = pendientesDetalle(detalle);
        if (pendientes.length > 0) {
            setHighlightByConteoId((p) => ({ ...p, [detalle.conteoId!]: true }));
            toast.warn(`No puedes finalizar: faltan ${pendientes.length} ítem(s) por gestionar.`);
            return;
        }

        setHighlightByConteoId((p) => ({ ...p, [detalle.conteoId!]: false }));
        setConfirmDetalle(detalle);
        onOpenChange(true);
    };

    useImperativeHandle(ref, () => ({ openConfirm }), [
        finalizandoByConteoId,
        highlightByConteoId,
        detalles,
        open,
    ]);

    const confirmarFinalizar = async () => {
        const detalle = confirmDetalle;
        if (!detalle) return;

        if (!editableDetalle(detalle)) {
            toast.info("Conteo cerrado. Solo lectura.");
            onOpenChange(false);
            setConfirmDetalle(null);
            return;
        }

        const pendientes = pendientesDetalle(detalle);
        if (pendientes.length > 0) {
            setHighlightByConteoId((p) => ({ ...p, [detalle.conteoId!]: true }));
            toast.warn(`No puedes finalizar: faltan ${pendientes.length} ítem(s) por gestionar.`);
            onOpenChange(false);
            setConfirmDetalle(null);
            return;
        }

        const conteoId = detalle.conteoId;
        if (!conteoId) return;
        if (finalizandoByConteoId[conteoId]) return;

        setFinalizandoByConteoId((p) => ({ ...p, [conteoId]: true }));
        try {
            await finalizarConteo({
                operacionId: detalle.operacionId,
                numeroConteo: detalle.numeroConteo,
                conteoId,
            });
            setDetalles((prev) =>
                prev.map((d) => (d.conteoId === conteoId ? { ...d, estadoConteo: "CERRADO" } : d))
            );
            toast.success("Conteo cerrado correctamente.");
            onOpenChange(false);
            setConfirmDetalle(null);
            setHighlightByConteoId((p) => ({ ...p, [conteoId]: false }));
            onAfterClose();
        } catch (error: any) {
            const msg =
                error?.response?.data?.mensaje ||
                error?.response?.data?.message ||
                (typeof error?.response?.data === "string" ? error.response.data : null) ||
                error?.message ||
                "No se pudo cerrar el conteo.";
            toast.error(String(msg));
        } finally {
            setFinalizandoByConteoId((p) => ({ ...p, [conteoId]: false }));
        }
    };

    const confirmLoading = useMemo(() => {
        const id = confirmDetalle?.conteoId;
        if (!id) return false;
        return !!finalizandoByConteoId[id];
    }, [confirmDetalle, finalizandoByConteoId]);

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (confirmLoading) return;
                onOpenChange(v);
                if (!v) {
                    setConfirmDetalle(null);
                    onAfterClose();
                }
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>¿Finalizar este conteo?</DialogTitle>
                    <DialogDescription>
                        Quedará en solo lectura.
                        {confirmDetalle
                            ? ` (Grupo: ${confirmDetalle.grupo} · Conteo #${confirmDetalle.numeroConteo})`
                            : ""}
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline" disabled={confirmLoading}>
                            Cancelar
                        </Button>
                    </DialogClose>

                    <Button onClick={() => void confirmarFinalizar()} disabled={confirmLoading}>
                        {confirmLoading ? "Finalizando..." : "Finalizar"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
});

export default ConteosFinalizarFlow;
