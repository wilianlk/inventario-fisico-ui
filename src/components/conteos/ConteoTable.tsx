import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { ItemConteo } from "@/services/conteoService";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

export interface SearchFilters {
    codigoItem: string;
    descripcion: string;
    lote: string;
    ubicacion: string;
}

type Parts = {
    unidades: string;
    paquetes: string;
    sueltas: string;
    total: string;
};

interface Props {
    items: ItemConteo[];
    loading: boolean;
    onUpdateCantidad: (id: number, cantidad: number) => Promise<void>;
    filterUbicacion?: string | null;
    selectedItemId?: number | null;
    searchFilters: SearchFilters;
}

const ConteoTable = ({
                         items,
                         loading,
                         onUpdateCantidad,
                         filterUbicacion,
                         selectedItemId,
                         searchFilters,
                     }: Props) => {
    const [partsById, setPartsById] = useState<Record<number, Parts>>({});
    const lastSavedTotalRef = useRef<Record<number, number>>({});
    const totalRefs = useRef<Record<number, HTMLInputElement | null>>({});

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

    if (loading) {
        return (
            <div className="py-6 sm:py-8 text-center text-xs sm:text-sm text-slate-500">
                Cargando ítems...
            </div>
        );
    }

    const fUbi = (filterUbicacion || "").trim();
    const fCodigo = (searchFilters.codigoItem || "").trim().toLowerCase();
    const fDesc = (searchFilters.descripcion || "").trim().toLowerCase();
    const fLote = (searchFilters.lote || "").trim().toLowerCase();
    const fUbiSearch = (searchFilters.ubicacion || "").trim().toLowerCase();

    const filtrados = items.filter((i) => {
        const ub = i.ubicacion.trim();
        if (fUbi && ub !== fUbi) return false;

        const codigo = i.codigoItem.trim().toLowerCase();
        const desc = (i.descripcion || "").toLowerCase();
        const lote = (i.lote || "").trim().toLowerCase();
        const ubic = ub.toLowerCase();

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

    const getParts = (item: ItemConteo): Parts => {
        const p = partsById[item.id];
        if (p) return p;

        const base =
            item.cantidadContada !== null && item.cantidadContada !== undefined
                ? String(item.cantidadContada)
                : "";

        return { unidades: "", paquetes: "", sueltas: "", total: base };
    };

    const anyManualFilled = (p: Parts) =>
        (p.unidades || "").trim() !== "" ||
        (p.paquetes || "").trim() !== "" ||
        (p.sueltas || "").trim() !== "";

    const calcularManual = (p: Parts) => {
        const u = toNum(p.unidades);
        const paq = toNum(p.paquetes);
        const s = toNum(p.sueltas);
        const total = u * paq + s;
        return total < 0 ? 0 : total;
    };

    const getTotalDisplay = (p: Parts) => {
        if (anyManualFilled(p)) return calcularManual(p);
        const t = toNum(p.total);
        return t < 0 ? 0 : t;
    };

    const setPart = (id: number, next: Parts) => {
        setPartsById((prev) => ({ ...prev, [id]: next }));
    };

    const setManualField = (
        item: ItemConteo,
        key: "unidades" | "paquetes" | "sueltas",
        value: string
    ) => {
        const p = getParts(item);
        const next = { ...p, [key]: value };
        const totalManual = calcularManual(next);
        setPart(item.id, { ...next, total: String(totalManual) });
    };

    const setTotalField = (item: ItemConteo, value: string) => {
        const p = getParts(item);
        setPart(item.id, { ...p, unidades: "", paquetes: "", sueltas: "", total: value });
    };

    const guardarSiCambia = async (item: ItemConteo) => {
        const p = getParts(item);
        const total = getTotalDisplay(p);
        const last = lastSavedTotalRef.current[item.id] ?? 0;
        if (total === last) return;

        await onUpdateCantidad(item.id, total);
        lastSavedTotalRef.current[item.id] = total;
    };

    const handleKeyDownTotal = (e: KeyboardEvent<HTMLInputElement>, item: ItemConteo) => {
        if (e.key === "Enter") {
            e.preventDefault();
            void guardarSiCambia(item);
        }
    };

    return (
        <div className="w-full rounded-xl border bg-white p-3 sm:p-4 shadow-sm overflow-x-auto md:overflow-visible">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="whitespace-nowrap text-[11px] sm:text-xs md:text-sm">
                            Código ítem
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-[11px] sm:text-xs md:text-sm">
                            Descripción
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-[11px] sm:text-xs md:text-sm">
                            Udm
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-[11px] sm:text-xs md:text-sm">
                            Ubicación
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-[11px] sm:text-xs md:text-sm">
                            Num. lote
                        </TableHead>
                        <TableHead className="whitespace-nowrap text-[11px] sm:text-xs md:text-sm">
                            Contada
                        </TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {filtrados.map((item) => {
                        const p = getParts(item);
                        const totalDisplay = getTotalDisplay(p);

                        return (
                            <TableRow
                                id={`row-${item.id}`}
                                key={item.id}
                                className={selectedItemId === item.id ? "bg-blue-50" : undefined}
                            >
                                <TableCell className="font-mono text-[11px] sm:text-xs md:text-xs">
                                    {item.codigoItem.trim()}
                                </TableCell>
                                <TableCell className="text-[11px] sm:text-xs md:text-xs">
                                    {item.descripcion}
                                </TableCell>
                                <TableCell className="text-[11px] sm:text-xs md:text-xs">
                                    {item.udm}
                                </TableCell>
                                <TableCell className="font-mono text-[11px] sm:text-xs md:text-xs">
                                    {item.ubicacion.trim()}
                                </TableCell>
                                <TableCell className="font-mono text-[11px] sm:text-xs md:text-xs">
                                    {item.lote ? item.lote.trim() : ""}
                                </TableCell>

                                <TableCell className="min-w-[420px]">
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            className="h-8 w-20 text-[11px] sm:text-xs md:text-xs"
                                            placeholder="Unid"
                                            value={p.unidades}
                                            onChange={(e) => setManualField(item, "unidades", e.target.value)}
                                            min={0}
                                        />
                                        <div className="text-xs text-slate-500 font-mono">x</div>
                                        <Input
                                            type="number"
                                            className="h-8 w-20 text-[11px] sm:text-xs md:text-xs"
                                            placeholder="Paq"
                                            value={p.paquetes}
                                            onChange={(e) => setManualField(item, "paquetes", e.target.value)}
                                            min={0}
                                        />
                                        <div className="text-xs text-slate-500 font-mono">+</div>
                                        <Input
                                            type="number"
                                            className="h-8 w-20 text-[11px] sm:text-xs md:text-xs"
                                            placeholder="Suelta"
                                            value={p.sueltas}
                                            onChange={(e) => setManualField(item, "sueltas", e.target.value)}
                                            min={0}
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
                                            ref={(el) => {
                                                totalRefs.current[item.id] = el;
                                            }}
                                        />
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
