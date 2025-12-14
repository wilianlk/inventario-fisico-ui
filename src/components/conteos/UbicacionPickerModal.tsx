import { useEffect, useMemo, useState } from "react";
import { ItemConteo } from "@/services/conteoService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";

interface Props {
    open: boolean;
    onClose: () => void;

    pendingKey: string;

    ubicaciones: string[];
    ubicCounts: Record<string, number>;

    ubicSelected: string | null;
    onSelectUbicacion: (ubicacion: string) => Promise<void>;
    onCambiarUbicacion: () => void;

    filasDeUbicacion: ItemConteo[];
    onElegirFila: (itemId: number) => Promise<void>;
}

const UbicacionPickerModal = ({
                                  open,
                                  onClose,
                                  pendingKey,
                                  ubicaciones,
                                  ubicCounts,
                                  ubicSelected,
                                  onSelectUbicacion,
                                  onCambiarUbicacion,
                                  filasDeUbicacion,
                                  onElegirFila,
                              }: Props) => {
    const [q, setQ] = useState("");
    const [busy, setBusy] = useState(false);

    const norm = (v: string) => v.replace(/\r?\n/g, "").trim();

    useEffect(() => {
        if (!open) return;
        setQ("");
        setBusy(false);
    }, [open]);

    const ubicacionesFiltradas = useMemo(() => {
        const query = norm(q).toLowerCase();
        if (!query) return ubicaciones;
        return ubicaciones.filter((u) => u.toLowerCase().includes(query));
    }, [q, ubicaciones]);

    const titulo = `Ítem ${pendingKey} en varias ubicaciones`;
    const desc =
        "Selecciona la ubicación. Si esa ubicación tiene varias filas, elige la fila exacta. (El escáner es solo Código ítem).";

    const handleClickUbic = async (u: string) => {
        if (busy) return;
        setBusy(true);
        try {
            await onSelectUbicacion(u);
            setQ("");
        } finally {
            setBusy(false);
        }
    };

    const handleElegirFila = async (id: number) => {
        if (busy) return;
        setBusy(true);
        try {
            await onElegirFila(id);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{titulo}</DialogTitle>
                    <DialogDescription>{desc}</DialogDescription>
                </DialogHeader>

                <div className="space-y-3">
                    {!ubicSelected ? (
                        <>
                            <div className="space-y-1">
                                <div className="text-xs font-medium text-slate-700">Buscar ubicación</div>
                                <Input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Filtra ubicaciones (ej: E202)"
                                    autoComplete="off"
                                    disabled={busy}
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="text-sm text-slate-600">
                                    Ubicaciones encontradas ({ubicacionesFiltradas.length})
                                </div>

                                <div className="rounded-lg border bg-white divide-y">
                                    {ubicacionesFiltradas.map((u) => (
                                        <button
                                            key={u}
                                            type="button"
                                            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-slate-50 disabled:opacity-60"
                                            onClick={() => handleClickUbic(u)}
                                            disabled={busy}
                                        >
                                            <span className="font-mono font-semibold">{u}</span>
                                            <span className="text-xs text-slate-500">
                        {ubicCounts[u] ?? 0} fila{(ubicCounts[u] ?? 0) === 1 ? "" : "s"}
                      </span>
                                        </button>
                                    ))}
                                </div>

                                <div className="flex justify-end">
                                    <Button variant="outline" onClick={onClose} disabled={busy}>
                                        Cancelar
                                    </Button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2">
                                <div className="text-sm text-slate-600">
                                    Ubicación seleccionada:{" "}
                                    <span className="font-mono font-semibold">{ubicSelected}</span>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onCambiarUbicacion}
                                    disabled={busy}
                                >
                                    Cambiar ubicación
                                </Button>
                            </div>

                            {filasDeUbicacion.length <= 1 ? (
                                <div className="text-sm text-slate-500">
                                    Selecciona una ubicación diferente.
                                </div>
                            ) : (
                                <div className="rounded-lg border bg-white overflow-hidden">
                                    <div className="px-4 py-2 text-xs text-slate-500 bg-slate-50 border-b">
                                        Hay {filasDeUbicacion.length} filas en esta ubicación. Elige la correcta.
                                    </div>

                                    <div className="divide-y">
                                        {filasDeUbicacion.map((it) => (
                                            <div
                                                key={it.id}
                                                className="px-4 py-3 flex items-center justify-between gap-3"
                                            >
                                                <div className="min-w-0">
                                                    <div className="text-xs sm:text-sm font-mono font-semibold">
                                                        {it.codigoItem.trim()}
                                                        {it.lote ? ` · Lote ${it.lote.trim()}` : ""}
                                                    </div>
                                                    <div className="text-xs text-slate-600 truncate">{it.descripcion}</div>
                                                </div>

                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleElegirFila(it.id)}
                                                    disabled={busy}
                                                >
                                                    Elegir
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end">
                                <Button variant="outline" onClick={onClose} disabled={busy}>
                                    Cerrar
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default UbicacionPickerModal;
