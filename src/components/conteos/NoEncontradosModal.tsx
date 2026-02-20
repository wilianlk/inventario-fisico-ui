import { useEffect, useState } from "react";
import { ItemConteo, obtenerNoEncontradosPorConteo } from "@/services/conteoService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
    open: boolean;
    conteoId: number | null;
    onClose: () => void;
}

export default function NoEncontradosModal({ open, conteoId, onClose }: Props) {
    const [items, setItems] = useState<ItemConteo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const extraerMsgError = (err: any, fallback: string) => {
        const data = err?.response?.data;
        if (typeof data === "string" && data.trim()) return data;
        return data?.mensaje || data?.message || fallback;
    };

    useEffect(() => {
        if (!open || !conteoId) return;

        setLoading(true);
        setError(null);
        obtenerNoEncontradosPorConteo(conteoId)
            .then((r) => setItems(r.data ?? []))
            .catch((err) => {
                const msg = extraerMsgError(err, "Error al cargar no encontrados.");
                setError(msg);
            })
            .finally(() => setLoading(false));
    }, [open, conteoId]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />

            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-full max-w-5xl rounded-2xl bg-white shadow-xl border">
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <div className="text-sm font-semibold">
                            Detalle no encontrados {conteoId ? <span className="font-mono">· Conteo {conteoId}</span> : null}
                        </div>

                        <button
                            type="button"
                            className="text-sm px-3 py-2 rounded-lg border bg-white"
                            onClick={onClose}
                        >
                            Cerrar
                        </button>
                    </div>

                    <div className="p-4">
                        {loading ? (
                            <div className="text-sm text-slate-600">Cargando…</div>
                        ) : error ? (
                            <div className="text-sm text-red-700">{error}</div>
                        ) : items.length === 0 ? (
                            <div className="text-sm text-slate-600">No hay ítems no encontrados.</div>
                        ) : (
                            <>
                                <div className="text-xs text-slate-600 mb-3">
                                    Total: <span className="font-semibold">{items.length}</span>
                                </div>

                                <div className="md:hidden space-y-2 max-h-[70vh] overflow-auto pr-1">
                                    {items.map((item) => {
                                        const etiqueta = (((item as any).etiqueta ?? "") as string).toString().trim();
                                        return (
                                            <div key={item.id} className="rounded-xl border bg-white p-3 shadow-sm">
                                                <div className="text-xs font-semibold text-slate-900">
                                                    {etiqueta ? `${etiqueta} · ` : ""}
                                                    <span className="font-mono">{(item.codigoItem || "").trim()}</span>
                                                </div>

                                                <div className="text-[11px] text-slate-600 mt-1 line-clamp-2">
                                                    {item.descripcion}
                                                </div>

                                                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-700">
                                                    <div>
                                                        <div className="text-slate-500">Ubicación</div>
                                                        <div className="font-mono truncate">{(item.ubicacion || "").trim()}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-slate-500">Lote</div>
                                                        <div className="font-mono truncate">{item.lote ? item.lote.trim() : ""}</div>
                                                    </div>
                                                    <div>
                                                        <div className="text-slate-500">Udm</div>
                                                        <div className="truncate">{item.udm}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-slate-500">Contada</div>
                                                        <div className="font-mono">{item.cantidadContada ?? ""}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="hidden md:block max-h-[70vh] overflow-auto rounded-xl border bg-white">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead className="whitespace-nowrap">Etiqueta</TableHead>
                                                <TableHead className="whitespace-nowrap">Código ítem</TableHead>
                                                <TableHead className="whitespace-nowrap">Descripción</TableHead>
                                                <TableHead className="whitespace-nowrap">Udm</TableHead>
                                                <TableHead className="whitespace-nowrap">Ubicación</TableHead>
                                                <TableHead className="whitespace-nowrap">Num. lote</TableHead>
                                                <TableHead className="whitespace-nowrap text-right">Contada</TableHead>
                                            </TableRow>
                                        </TableHeader>

                                        <TableBody>
                                            {items.map((item) => {
                                                const etiqueta = (((item as any).etiqueta ?? "") as string).toString().trim();
                                                return (
                                                    <TableRow key={item.id}>
                                                        <TableCell className="font-mono text-xs">{etiqueta}</TableCell>
                                                        <TableCell className="font-mono text-xs">{(item.codigoItem || "").trim()}</TableCell>
                                                        <TableCell className="text-xs">{item.descripcion}</TableCell>
                                                        <TableCell className="text-xs">{item.udm}</TableCell>
                                                        <TableCell className="font-mono text-xs">{(item.ubicacion || "").trim()}</TableCell>
                                                        <TableCell className="font-mono text-xs">{item.lote ? item.lote.trim() : ""}</TableCell>
                                                        <TableCell className="font-mono text-xs text-right">{item.cantidadContada ?? ""}</TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
