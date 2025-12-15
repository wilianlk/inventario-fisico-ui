import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { ItemConteo } from "@/services/conteoService";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export interface SearchFilters {
    etiqueta: string;
    codigoItem: string;
    descripcion: string;
    lote: string;
    ubicacion: string;
}

type Parts = {
    unidades: string;
    paquetes: string;
    saldos: string; // Cambiado de "sueltas" a "saldos"
    total: string;
};

type RowState =
    | { status: "idle" }
    | { status: "saving" }
    | { status: "saved" }
    | { status: "error"; message: string; locked?: boolean };

interface Props {
    items: ItemConteo[];
    loading: boolean;
    onUpdateCantidad: (id: number, cantidad: number) => Promise<void>;
    selectedItemId?: number | null;
    searchFilters: SearchFilters;
}

const ConteoTable = ({
                         items,
                         loading,
                         onUpdateCantidad,
                         selectedItemId,
                         searchFilters,
                     }: Props) => {
    const [partsById, setPartsById] = useState<Record<number, Parts>>({});
    const [rowStateById, setRowStateById] = useState<Record<number, RowState>>({});
    const [locked, setLocked] = useState(false);

    const lastSavedTotalRef = useRef<Record<number, number>>({});
    const totalRefs = useRef<Record<number, HTMLInputElement | null>>({});
    const clearSavedTimersRef = useRef<Record<number, number>>({});

    useEffect(() => {
        if (!selectedItemId) return;
        const row = document.getElementById(`row-${selectedItemId}`);
        row?.scrollIntoView({ behavior: "smooth", block: "center" });
        const el = totalRefs.current[selectedItemId];
        el?.focus();
        el?.select();
    }, [selectedItemId]);

    useEffect(() => {
        const map: Record<number, number> = {};
        for (const it of items) map[it.id] = it.cantidadContada ?? 0;
        lastSavedTotalRef.current = { ...lastSavedTotalRef.current, ...map };
    }, [items]);

    useEffect(() => {
        return () => {
            for (const k of Object.keys(clearSavedTimersRef.current)) {
                window.clearTimeout(clearSavedTimersRef.current[Number(k)]);
            }
        };
    }, []);

    if (loading) {
        return (
            <div className="py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-500">
                Cargando ítems...
            </div>
        );
    }

    const fEtiqueta = (searchFilters.etiqueta || "").trim().toLowerCase();
    const fCodigo = (searchFilters.codigoItem || "").trim().toLowerCase();
    const fDesc = (searchFilters.descripcion || "").trim().toLowerCase();
    const fLote = (searchFilters.lote || "").trim().toLowerCase();
    const fUbiSearch = (searchFilters.ubicacion || "").trim().toLowerCase();

    const filtrados = items.filter((i) => {
        const etiqueta = (((i as any).etiqueta ?? "") as string).toString().trim().toLowerCase();
        const codigo = (i.codigoItem || "").trim().toLowerCase();
        const desc = (i.descripcion || "").toLowerCase();
        const lote = (i.lote || "").trim().toLowerCase();
        const ubic = (i.ubicacion || "").trim().toLowerCase();

        if (fEtiqueta && !etiqueta.includes(fEtiqueta)) return false;
        if (fCodigo && !codigo.includes(fCodigo)) return false;
        if (fDesc && !desc.includes(fDesc)) return false;
        if (fLote && !lote.includes(fLote)) return false;
        if (fUbiSearch && !ubic.includes(fUbiSearch)) return false;

        return true;
    });

    if (!filtrados || filtrados.length === 0) {
        return (
            <div className="py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-500">
                No hay ítems para mostrar.
            </div>
        );
    }

    const toNum = (v: string) => {
        if (v === "" || v === null || v === undefined) return 0;
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };

    const clamp0 = (n: number) => (n < 0 ? 0 : n);

    const getParts = (item: ItemConteo): Parts => {
        const p = partsById[item.id];
        if (p) return p;

        const base = String(item.cantidadContada ?? 0);
        return { unidades: "", paquetes: "", saldos: "", total: base }; // Cambio aquí de "sueltas" a "saldos"
    };

    const anyManualFilled = (p: Parts) =>
        (p.unidades || "").trim() !== "" ||
        (p.paquetes || "").trim() !== "" ||
        (p.saldos || "").trim() !== ""; // Cambio aquí de "sueltas" a "saldos"

    const calcularManual = (p: Parts) => {
        const u = toNum(p.unidades);
        const paq = toNum(p.paquetes);
        const s = toNum(p.saldos); // Cambio aquí de "sueltas" a "saldos"
        return clamp0(u * paq + s);
    };

    const getTotalDisplay = (p: Parts) => {
        if (anyManualFilled(p)) return calcularManual(p);
        return clamp0(toNum(p.total));
    };

    const setPart = (id: number, next: Parts) => {
        setPartsById((prev) => ({ ...prev, [id]: next }));
    };

    const setManualField = (
        item: ItemConteo,
        key: "unidades" | "paquetes" | "saldos", // Cambio aquí de "sueltas" a "saldos"
        value: string
    ) => {
        if (locked) return;
        const p = getParts(item);
        const next = { ...p, [key]: value };
        const totalManual = calcularManual(next);
        setPart(item.id, { ...next, total: String(totalManual) });
    };

    const setTotalField = (item: ItemConteo, value: string) => {
        if (locked) return;
        const p = getParts(item);
        setPart(item.id, { ...p, unidades: "", paquetes: "", saldos: "", total: value }); // Cambio aquí de "sueltas" a "saldos"
    };

    const setRowState = (id: number, state: RowState) => {
        setRowStateById((prev) => ({ ...prev, [id]: state }));
    };

    const markSavedTemporarily = (id: number) => {
        if (clearSavedTimersRef.current[id]) {
            window.clearTimeout(clearSavedTimersRef.current[id]);
        }
        clearSavedTimersRef.current[id] = window.setTimeout(() => {
            setRowState(id, { status: "idle" });
        }, 1200);
    };

    const extractError = (err: any): { status?: number; message: string } => {
        const status = err?.response?.status;
        const msg =
            err?.response?.data?.mensaje ||
            err?.response?.data?.message ||
            err?.message ||
            "Error al guardar.";
        return { status, message: String(msg) };
    };

    const guardarSiCambia = async (item: ItemConteo) => {
        if (locked) return;

        const p = getParts(item);
        const total = getTotalDisplay(p);

        const last = lastSavedTotalRef.current[item.id] ?? (item.cantidadContada ?? 0);
        if (total === last) return;

        setRowState(item.id, { status: "saving" });

        try {
            await onUpdateCantidad(item.id, total);
            lastSavedTotalRef.current[item.id] = total;
            setRowState(item.id, { status: "saved" });
            markSavedTemporarily(item.id);
        } catch (err) {
            const { status, message } = extractError(err);
            const isLocked = status === 409;
            if (isLocked) setLocked(true);

            setRowState(item.id, { status: "error", message, locked: isLocked });
            toast.error(message);

            if ((p.total || "").trim() === "") {
                setTotalField(item, String(last));
            }
        }
    };

    const handleKeyDownTotal = (e: KeyboardEvent<HTMLInputElement>, item: ItemConteo) => {
        if (e.key === "Enter") {
            e.preventDefault();
            void guardarSiCambia(item);
        }
    };

    const renderRowState = (rs: RowState | undefined) => {
        if (!rs || rs.status === "idle") return null;

        if (rs.status === "saving") return <span className="text-[11px] text-slate-500">Guardando...</span>;
        if (rs.status === "saved") return <span className="text-[11px] text-emerald-600">Guardado</span>;

        return (
            <span className="text-[11px] text-red-600" title={rs.message}>
        Error
      </span>
        );
    };

    return (
        <div className="w-full rounded-xl border bg-white p-3 sm:p-4 shadow-sm overflow-x-auto md:overflow-visible">
            {locked ? (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Edición bloqueada: la operación está cerrada o ya fue consolidada.
                </div>
            ) : null}

            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="whitespace-nowrap text-[11px] sm:text-xs md:text-sm">Etiqueta</TableHead>
                        <TableHead className="whitespace-nowrap text-[11px] sm:text-xs md:text-sm">Código ítem</TableHead>
                        <TableHead className="whitespace-nowrap text-[11px] sm:text-xs md:text-sm">Descripción</TableHead>
                        <TableHead className="whitespace-nowrap text-[11px] sm:text-xs md:text-sm">Udm</TableHead>
                        <TableHead className="whitespace-nowrap text-[11px] sm:text-xs md:text-sm">Ubicación</TableHead>
                        <TableHead className="whitespace-nowrap text-[11px] sm:text-xs md:text-sm">Num. lote</TableHead>
                        <TableHead className="whitespace-nowrap text-[11px] sm:text-xs md:text-sm">Contada</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {filtrados.map((item) => {
                        const p = getParts(item);
                        const totalDisplay = getTotalDisplay(p);
                        const etiqueta = (((item as any).etiqueta ?? "") as string).toString().trim();
                        const rs = rowStateById[item.id];

                        return (
                            <TableRow
                                id={`row-${item.id}`}
                                key={item.id}
                                className={selectedItemId === item.id ? "bg-blue-50" : undefined}
                            >
                                <TableCell className="font-mono text-[11px] sm:text-xs md:text-xs">{etiqueta}</TableCell>
                                <TableCell className="font-mono text-[11px] sm:text-xs md:text-xs">
                                    {(item.codigoItem || "").trim()}
                                </TableCell>
                                <TableCell className="text-[11px] sm:text-xs md:text-xs">{item.descripcion}</TableCell>
                                <TableCell className="text-[11px] sm:text-xs md:text-xs">{item.udm}</TableCell>
                                <TableCell className="font-mono text-[11px] sm:text-xs md:text-xs">
                                    {(item.ubicacion || "").trim()}
                                </TableCell>
                                <TableCell className="font-mono text-[11px] sm:text-xs md:text-xs">
                                    {item.lote ? item.lote.trim() : ""}
                                </TableCell>

                                <TableCell className="min-w-[460px]">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            className="h-8 w-20 text-[11px] sm:text-xs md:text-xs"
                                            placeholder="Unid"
                                            value={p.unidades}
                                            onChange={(e) => setManualField(item, "unidades", e.target.value)}
                                            min={0}
                                            disabled={locked}
                                        />
                                        <div className="text-xs text-slate-500 font-mono">x</div>
                                        <Input
                                            type="number"
                                            className="h-8 w-20 text-[11px] sm:text-xs md:text-xs"
                                            placeholder="Paq"
                                            value={p.paquetes}
                                            onChange={(e) => setManualField(item, "paquetes", e.target.value)}
                                            min={0}
                                            disabled={locked}
                                        />
                                        <div className="text-xs text-slate-500 font-mono">+</div>
                                        <Input
                                            type="number"
                                            className="h-8 w-20 text-[11px] sm:text-xs md:text-xs"
                                            placeholder="Saldos"
                                            value={p.saldos} // Cambiado de "sueltas" a "saldos"
                                            onChange={(e) => setManualField(item, "saldos", e.target.value)} // Cambiado de "sueltas" a "saldos"
                                            min={0}
                                            disabled={locked}
                                        />
                                        <div className="text-xs text-slate-500 font-mono">=</div>
                                        <Input
                                            type="number"
                                            className="h-8 w-24 text-[11px] sm:text-xs md:text-xs font-mono"
                                            placeholder="Total"
                                            value={anyManualFilled(p) ? String(totalDisplay) : p.total}
                                            onChange={(e) => setTotalField(item, e.target.value)}
                                            onKeyDown={(e) => handleKeyDownTotal(e, item)}
                                            onBlur={() => void guardarSiCambia(item)}
                                            min={0}
                                            disabled={locked}
                                            ref={(el) => {
                                                totalRefs.current[item.id] = el;
                                            }}
                                        />

                                        <div className="min-w-[72px] text-right">{renderRowState(rs)}</div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
};

export default ConteoTable;
