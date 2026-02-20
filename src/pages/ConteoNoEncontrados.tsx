import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DetalleConteo, obtenerConteoActual } from "@/services/conteoService";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import NoEncontradosModal from "@/components/conteos/NoEncontradosModal";

type ConteoResumen = {
    conteoId: number;
    numeroConteo: number;
    grupoId: number;
    grupo: string;
    operacionId: number;
    totalNoEncontrados: number;
};

export default function ConteoNoEncontrados() {
    const navigate = useNavigate();

    const [detalle, setDetalle] = useState<DetalleConteo[]>([]);
    const [loading, setLoading] = useState(true);

    const [open, setOpen] = useState(false);
    const [selectedConteoId, setSelectedConteoId] = useState<number | null>(null);
    const didLoadRef = useRef(false);

    useEffect(() => {
        if (didLoadRef.current) return;
        didLoadRef.current = true;
        setLoading(true);
        obtenerConteoActual()
            .then((r) => setDetalle(r.data ?? []))
            .finally(() => setLoading(false));
    }, []);

    const conteosConNoEncontrados: ConteoResumen[] = useMemo(() => {
        const rows: ConteoResumen[] = [];

        for (const c of detalle) {
            const total = (c.items ?? []).filter((it: any) => it?.noEncontrado === true).length;
            if (total <= 0) continue;

            rows.push({
                conteoId: c.conteoId,
                numeroConteo: c.numeroConteo,
                grupoId: c.grupoId,
                grupo: c.grupo,
                operacionId: c.operacionId,
                totalNoEncontrados: total,
            });
        }

        rows.sort((a, b) => b.totalNoEncontrados - a.totalNoEncontrados);
        return rows;
    }, [detalle]);

    const abrirDetalle = (conteoId: number) => {
        setSelectedConteoId(conteoId);
        setOpen(true);
    };

    const cerrarDetalle = () => {
        setOpen(false);
        setSelectedConteoId(null);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-lg font-semibold">No encontrados</h1>

                <button
                    type="button"
                    className="text-sm px-3 py-2 rounded-lg border bg-white"
                    onClick={() => navigate(-1)}
                >
                    Volver
                </button>
            </div>

            {loading ? (
                <div className="text-sm text-slate-600">Cargando…</div>
            ) : conteosConNoEncontrados.length === 0 ? (
                <div className="text-sm text-slate-600">No hay conteos con ítems no encontrados.</div>
            ) : (
                <>
                    <div className="text-xs text-slate-600">
                        Conteos con no encontrados:{" "}
                        <span className="font-semibold">{conteosConNoEncontrados.length}</span>
                    </div>

                    <div className="md:hidden space-y-2">
                        {conteosConNoEncontrados.map((c) => (
                            <div key={c.conteoId} className="rounded-xl border bg-white p-3 shadow-sm">
                                <div className="text-xs font-semibold text-slate-900">
                                    {c.grupo} · <span className="font-mono">Conteo {c.numeroConteo}</span>
                                </div>

                                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-700">
                                    <div>
                                        No encontrados:{" "}
                                        <span className="font-semibold">{c.totalNoEncontrados}</span>
                                    </div>

                                    <button
                                        type="button"
                                        className="text-[11px] px-3 py-2 rounded-lg border bg-white"
                                        onClick={() => abrirDetalle(c.conteoId)}
                                    >
                                        Ver detalle
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="hidden md:block overflow-x-auto rounded-xl border bg-white">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="whitespace-nowrap">Grupo</TableHead>
                                    <TableHead className="whitespace-nowrap">Conteo</TableHead>
                                    <TableHead className="whitespace-nowrap text-right">No encontrados</TableHead>
                                    <TableHead className="whitespace-nowrap"></TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {conteosConNoEncontrados.map((c) => (
                                    <TableRow key={c.conteoId}>
                                        <TableCell className="text-xs">{c.grupo}</TableCell>
                                        <TableCell className="text-xs font-mono">#{c.numeroConteo}</TableCell>
                                        <TableCell className="text-xs font-mono text-right">
                                            {c.totalNoEncontrados}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <button
                                                type="button"
                                                className="text-xs px-3 py-2 rounded-lg border bg-white"
                                                onClick={() => abrirDetalle(c.conteoId)}
                                            >
                                                Ver detalle
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </>
            )}

            <NoEncontradosModal
                open={open}
                conteoId={selectedConteoId}
                onClose={cerrarDetalle}
            />
        </div>
    );
}
