import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { ItemConteo } from "@/services/conteoService";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export interface SearchFilters {
    etiqueta: string;
    codigoItem: string;
    descripcion: string;
    lote: string;
    ubicacion: string;
}

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
    editable?: boolean;
}

const ConteoTable = ({
                         items,
                         loading,
                         onUpdateCantidad,
                         selectedItemId,
                         searchFilters,
                         editable = true,
                     }: Props) => {
    const [unidById, setUnidById] = useState<Record<number, string>>({});
    const [rowStateById, setRowStateById] = useState<Record<number, RowState>>({});
    const [locked, setLocked] = useState(false);

    const lastSavedRef = useRef<Record<number, number>>({});
    const unidRefs = useRef<Record<number, HTMLInputElement | null>>({});
    const clearSavedTimersRef = useRef<Record<number, number>>({});

    useEffect(() => {
        if (!editable) {
            setLocked(true);
            return;
        }
        setLocked(false);
    }, [editable]);

    useEffect(() => {
        const nextSaved: Record<number, number> = {};
        const nextUnid: Record<number, string> = {};
        for (const it of items) {
            const v = it.cantidadContada ?? 0;
            nextSaved[it.id] = v;
            nextUnid[it.id] = String(v);
        }
        lastSavedRef.current = { ...lastSavedRef.current, ...nextSaved };
        setUnidById((prev) => ({ ...nextUnid, ...prev }));
    }, [items]);

    useEffect(() => {
        if (!selectedItemId) return;
        const row = document.getElementById(`row-${selectedItemId}`);
        row?.scrollIntoView({ behavior: "smooth", block: "center" });
        const el = unidRefs.current[selectedItemId];
        el?.focus();
        el?.select();
    }, [selectedItemId]);

    useEffect(() => {
        return () => {
            for (const k of Object.keys(clearSavedTimersRef.current)) {
                window.clearTimeout(clearSavedTimersRef.current[Number(k)]);
            }
        };
    }, []);

    if (loading) {
        return <div className="py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-500">Cargando ítems...</div>;
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
        return <div className="py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-500">No hay ítems para mostrar.</div>;
    }

    const toNum = (v: string) => {
        if (v === "" || v === null || v === undefined) return 0;
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
    };

    const clamp0 = (n: number) => (n < 0 ? 0 : n);

    const setRowState = (id: number, state: RowState) => {
        setRowStateById((prev) => ({ ...prev, [id]: state }));
    };

    const markSavedTemporarily = (id: number) => {
        if (clearSavedTimersRef.current[id]) window.clearTimeout(clearSavedTimersRef.current[id]);
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
        if (locked || !editable) return;

        const raw = (unidById[item.id] ?? "").toString();
        const total = clamp0(toNum(raw));

        const last = lastSavedRef.current[item.id] ?? (item.cantidadContada ?? 0);
        if (total === last) return;

        setRowState(item.id, { status: "saving" });

        try {
            await onUpdateCantidad(item.id, total);
            lastSavedRef.current[item.id] = total;
            setRowState(item.id, { status: "saved" });
            markSavedTemporarily(item.id);
        } catch (err: any) {
            const { status, message } = extractError(err);
            const isLocked = status === 409;
            if (isLocked) setLocked(true);

            setRowState(item.id, { status: "error", message, locked: isLocked });
            toast.error(message);

            setUnidById((prev) => ({ ...prev, [item.id]: String(last) }));
        }
    };

    const handleKeyDownUnid = (e: KeyboardEvent<HTMLInputElement>, item: ItemConteo) => {
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
            {!editable ? (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Conteo cerrado. Solo lectura.
                </div>
            ) : locked ? (
                <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    Edición bloqueada.
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
                        const etiqueta = (((item as any).etiqueta ?? "") as string).toString().trim();
                        const rs = rowStateById[item.id];
                        const disabled = locked || !editable;

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

                                <TableCell className="min-w-[220px]">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            className="h-8 w-28 text-[11px] sm:text-xs md:text-xs font-mono"
                                            placeholder="Unid"
                                            value={unidById[item.id] ?? String(item.cantidadContada ?? 0)}
                                            onChange={(e) =>
                                                setUnidById((prev) => ({ ...prev, [item.id]: e.target.value }))
                                            }
                                            onKeyDown={(e) => handleKeyDownUnid(e, item)}
                                            onBlur={() => void guardarSiCambia(item)}
                                            min={0}
                                            disabled={disabled}
                                            ref={(el) => {
                                                unidRefs.current[item.id] = el;
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
