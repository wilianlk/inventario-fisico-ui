import { KeyboardEvent } from "react";
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

type Parts = {
    unidades: string;
    paquetes: string;
    saldos: string;
    total: string;
};

type RowState =
    | { status: "idle" }
    | { status: "saving" }
    | { status: "saved" }
    | { status: "error"; message: string; locked?: boolean };

interface Props {
    items: ItemConteo[];
    selectedItemId: number | null;

    warnActive: boolean;
    getManaged: (id: number) => boolean;

    getParts: (item: ItemConteo) => Parts;
    anyManualFilled: (p: Parts) => boolean;
    getTotalDisplay: (p: Parts) => number | null;

    rowStateById: Record<number, RowState>;
    locked: boolean;
    editable: boolean;

    setManualField: (item: ItemConteo, key: "unidades" | "paquetes" | "saldos", value: string) => void;
    setTotalField: (item: ItemConteo, value: string) => void;

    handleKeyDownTotal: (e: KeyboardEvent<HTMLInputElement>, item: ItemConteo) => void;
    onBlurTotal: (item: ItemConteo) => void;

    setTotalRef: (id: number, el: HTMLInputElement | null) => void;
    renderRowState: (rs: RowState | undefined) => React.ReactNode;
}

export default function ConteoTableDesktopTable({
                                                    items,
                                                    selectedItemId,
                                                    warnActive,
                                                    getManaged,
                                                    getParts,
                                                    anyManualFilled,
                                                    getTotalDisplay,
                                                    rowStateById,
                                                    locked,
                                                    editable,
                                                    setManualField,
                                                    setTotalField,
                                                    handleKeyDownTotal,
                                                    onBlurTotal,
                                                    setTotalRef,
                                                    renderRowState,
                                                }: Props) {
    return (
        <div className="hidden md:block overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="whitespace-nowrap">Etiqueta</TableHead>
                        <TableHead className="whitespace-nowrap">Código ítem</TableHead>
                        <TableHead className="whitespace-nowrap">Descripción</TableHead>
                        <TableHead className="whitespace-nowrap">Udm</TableHead>
                        <TableHead className="whitespace-nowrap">Ubicación</TableHead>
                        <TableHead className="whitespace-nowrap">Num. lote</TableHead>
                        <TableHead className="whitespace-nowrap">Contada</TableHead>
                    </TableRow>
                </TableHeader>

                <TableBody>
                    {items.map((item) => {
                        const p = getParts(item);
                        const totalDisplay = getTotalDisplay(p);
                        const etiqueta = (((item as any).etiqueta ?? "") as string).toString().trim();
                        const rs = rowStateById[item.id];
                        const disabled = locked || !editable;

                        const managed = getManaged(item.id);
                        const paint = warnActive && !managed;

                        const cellWarnBase = paint ? "border-y border-red-400 bg-red-50/40" : "";
                        const cellWarnLeft = paint ? `${cellWarnBase} border-l border-red-400` : "";
                        const cellWarnRight = paint ? `${cellWarnBase} border-r border-red-400` : "";

                        return (
                            <TableRow
                                id={`row-${item.id}`}
                                data-item-id={item.id}
                                key={item.id}
                                className={selectedItemId === item.id ? "bg-blue-50" : undefined}
                            >
                                <TableCell className={`font-mono text-xs ${cellWarnLeft}`}>{etiqueta}</TableCell>
                                <TableCell className={`font-mono text-xs ${cellWarnBase}`}>
                                    {(item.codigoItem || "").trim()}
                                </TableCell>
                                <TableCell className={`text-xs ${cellWarnBase}`}>{item.descripcion}</TableCell>
                                <TableCell className={`text-xs ${cellWarnBase}`}>{item.udm}</TableCell>
                                <TableCell className={`font-mono text-xs ${cellWarnBase}`}>
                                    {(item.ubicacion || "").trim()}
                                </TableCell>
                                <TableCell className={`font-mono text-xs ${cellWarnBase}`}>
                                    {item.lote ? item.lote.trim() : ""}
                                </TableCell>

                                <TableCell className={`min-w-[460px] ${cellWarnRight}`}>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            type="number"
                                            step="any"
                                            className="h-8 w-20 text-xs"
                                            placeholder="Unid"
                                            value={p.unidades}
                                            onChange={(e) => setManualField(item, "unidades", e.target.value)}
                                            min={0}
                                            disabled={disabled}
                                        />
                                        <div className="text-xs text-slate-500 font-mono">x</div>
                                        <Input
                                            type="number"
                                            step="any"
                                            className="h-8 w-20 text-xs"
                                            placeholder="Paq"
                                            value={p.paquetes}
                                            onChange={(e) => setManualField(item, "paquetes", e.target.value)}
                                            min={0}
                                            disabled={disabled}
                                        />
                                        <div className="text-xs text-slate-500 font-mono">+</div>
                                        <Input
                                            type="number"
                                            step="any"
                                            className="h-8 w-20 text-xs"
                                            placeholder="Saldos"
                                            value={p.saldos}
                                            onChange={(e) => setManualField(item, "saldos", e.target.value)}
                                            min={0}
                                            disabled={disabled}
                                        />
                                        <div className="text-xs text-slate-500 font-mono">=</div>

                                        <Input
                                            type="number"
                                            step="any"
                                            className="h-8 w-24 text-xs font-mono"
                                            placeholder="Total"
                                            value={anyManualFilled(p) ? (totalDisplay === null ? "" : String(totalDisplay)) : p.total}
                                            onChange={(e) => setTotalField(item, e.target.value)}
                                            onKeyDown={(e) => handleKeyDownTotal(e, item)}
                                            onBlur={() => onBlurTotal(item)}
                                            min={0}
                                            disabled={disabled}
                                            ref={(el) => setTotalRef(item.id, el)}
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
}
