import { useEffect, useMemo, useState } from "react";
import { GrupoConteo } from "@/services/grupoConteoService";
import {
    eliminarFiltro,
    obtenerItemsPorGrupo,
    type FiltroGrupoUbicacion,
    type ItemPhystag,
} from "@/services/grupoUbicacionService";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "react-toastify";
import { GrupoUbicacionesAgregarDialog } from "./GrupoUbicacionesAgregarDialog";

interface GrupoUbicacionesProps {
    open: boolean;
    grupo: GrupoConteo | null;
    onClose: () => void;
}

type DupMode = "" | "UI" | "UIL"; // "" = sin criterio

export function GrupoUbicaciones({ open, grupo, onClose }: GrupoUbicacionesProps) {
    const [items, setItems] = useState<ItemPhystag[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [agregarOpen, setAgregarOpen] = useState(false);

    // filtros
    const [fUbic, setFUbic] = useState("");
    const [fItem, setFItem] = useState("");
    const [fLote, setFLote] = useState("");
    const [dupMode, setDupMode] = useState<DupMode>("");

    const N = (s: any) => (s ?? "").toString().trim().toUpperCase();

    const mostrarLado = useMemo(
        () => items.some((it: any) => N(it?.bodega) === "13M"),
        [items]
    );

    const load = async () => {
        if (!grupo) return;
        setLoading(true);
        setError(null);

        try {
            const res = await obtenerItemsPorGrupo(grupo.id);
            const data = (res as any)?.data ?? [];
            setItems(Array.isArray(data) ? data : []);
        } catch {
            setError("Error al cargar ítems del grupo.");
            toast.error("No se pudieron cargar los ítems del grupo.");
            setItems([]);
        } finally {
            setLoading(false);
        }
    };

    const parseUbicacionAComponentes = (bodega: string, ubicacion: string) => {
        const b = N(bodega);
        const u = N(ubicacion);

        if (b === "11" && u.length >= 4) {
            return { rack: u.slice(0, 1), lado: "", altura: u.slice(1, 2), ubicacion: u.slice(2, 4) };
        }
        if (b === "13M" && u.length >= 6) {
            return { rack: u.slice(0, 2), lado: u.slice(2, 3), altura: u.slice(3, 4), ubicacion: u.slice(4, 6) };
        }
        return null;
    };

    const handleQuitarUbicacion = async (bodega: string, ubicacionFinal: string) => {
        if (!grupo) return;

        const parts = parseUbicacionAComponentes(bodega, ubicacionFinal);
        if (!parts) {
            toast.error("No pude interpretar la ubicación.");
            return;
        }

        const filtro: FiltroGrupoUbicacion = {
            grupoId: grupo.id,
            bodega: N(bodega),
            rack: parts.rack,
            lado: parts.lado,
            altura: parts.altura,
            ubicacion: parts.ubicacion,
        };

        try {
            await eliminarFiltro(filtro);
            await load();
            toast.success("Ubicación quitada del grupo.");
        } catch (err: any) {
            const data = err?.response?.data;
            const msg =
                (typeof data === "string" && data.trim()) ||
                data?.mensaje ||
                data?.message ||
                "No se pudo eliminar.";
            setError(msg);
            toast.error(msg);
        }
    };

    // 1) filtros de texto (siempre)
    const itemsFiltrados = useMemo(() => {
        const fu = N(fUbic);
        const fi = N(fItem);
        const fl = N(fLote);

        return items.filter((it: any) => {
            const ubic = N(it?.ubicacion);
            const item = N(it?.item);
            const lote = N(it?.lote);

            if (fu && !ubic.includes(fu)) return false;
            if (fi && !item.includes(fi)) return false;
            if (fl && !lote.includes(fl)) return false;
            return true;
        });
    }, [items, fUbic, fItem, fLote]);

    // 2) contador de repetidos según modo
    const dupCount = useMemo(() => {
        const m = new Map<string, number>();
        if (dupMode === "") return m;

        for (const it of itemsFiltrados as any[]) {
            const ubic = N(it?.ubicacion);
            const item = N(it?.item);
            const lote = N(it?.lote);

            const key = dupMode === "UI" ? `${ubic}::${item}` : `${ubic}::${item}::${lote}`;
            m.set(key, (m.get(key) ?? 0) + 1);
        }

        return m;
    }, [itemsFiltrados, dupMode]);

    // 3) vista final:
    // - sin criterio: muestra itemsFiltrados
    // - con criterio: SOLO repetidos (cada uno en su propia línea), y ordenados por Item
    const itemsVista = useMemo(() => {
        const base = dupMode === ""
            ? itemsFiltrados
            : (itemsFiltrados as any[]).filter((it) => {
                const ubic = N(it?.ubicacion);
                const item = N(it?.item);
                const lote = N(it?.lote);
                const key = dupMode === "UI" ? `${ubic}::${item}` : `${ubic}::${item}::${lote}`;
                return (dupCount.get(key) ?? 0) > 1;
            });

        return [...(base as any[])].sort((a, b) => {
            const ai = N(a?.item), bi = N(b?.item);
            const c1 = ai.localeCompare(bi);
            if (c1 !== 0) return c1;

            const au = N(a?.ubicacion), bu = N(b?.ubicacion);
            const c2 = au.localeCompare(bu);
            if (c2 !== 0) return c2;

            const al = N(a?.lote), bl = N(b?.lote);
            return al.localeCompare(bl);
        });
    }, [itemsFiltrados, dupMode, dupCount]);

    const totalItems = items.length;
    const totalFiltrados = itemsVista.length;

    useEffect(() => {
        if (open && grupo) load();
    }, [open, grupo?.id]);

    const handleOpenChange = (value: boolean) => {
        if (!value) onClose();
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-6xl max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Ubicaciones del grupo</DialogTitle>
                    <DialogDescription>Ítems resultantes de los filtros asignados al grupo.</DialogDescription>
                </DialogHeader>

                <div className="flex justify-between items-center mb-2 text-sm">
                    <div className="space-x-2">
            <span>
              Grupo: <span className="font-medium">{grupo?.nombre}</span>
            </span>
                        <span className="text-xs text-slate-500">Total: {totalItems}</span>
                        <span className="text-xs text-slate-500">Filtrados: {totalFiltrados}</span>
                    </div>

                    <Button
                        size="sm"
                        onClick={() => setAgregarOpen(true)}
                        className="rounded-full h-8 px-3 text-xs"
                        disabled={!grupo}
                    >
                        Asignar ubicación al grupo
                    </Button>
                </div>

                {/* Filtros + repetidos */}
                <div className="mb-2 grid grid-cols-1 md:grid-cols-4 gap-2 border rounded p-3">
                    <div>
                        <Label className="text-xs">Ubicación</Label>
                        <Input
                            value={fUbic}
                            onChange={(e) => setFUbic(e.target.value)}
                            placeholder="Ej: B102"
                            className="h-9"
                        />
                    </div>

                    <div>
                        <Label className="text-xs">Item</Label>
                        <Input
                            value={fItem}
                            onChange={(e) => setFItem(e.target.value)}
                            placeholder="Ej: 005783"
                            className="h-9"
                        />
                    </div>

                    <div>
                        <Label className="text-xs">Lote</Label>
                        <Input
                            value={fLote}
                            onChange={(e) => setFLote(e.target.value)}
                            placeholder="Ej: L123"
                            className="h-9"
                        />
                    </div>

                    <div>
                        <Label className="text-xs">Criterio repetido</Label>
                        <select
                            value={dupMode}
                            onChange={(e) => setDupMode(e.target.value as DupMode)}
                            className="w-full h-9 rounded-md border border-slate-200 bg-white px-3 text-sm"
                        >
                            <option value="">Sin criterio</option>
                            <option value="UI">Ubicación + Item</option>
                            <option value="UIL">Ubicación + Item + Lote</option>
                        </select>
                    </div>

                    <div className="md:col-span-4 flex justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-9"
                            onClick={() => {
                                setFUbic("");
                                setFItem("");
                                setFLote("");
                                setDupMode("");
                            }}
                        >
                            Limpiar
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="mb-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
                        {error}
                    </div>
                )}

                <div className="flex-1 overflow-auto border rounded">
                    {loading ? (
                        <div className="p-4 text-sm">Cargando…</div>
                    ) : itemsVista.length === 0 ? (
                        <div className="p-6 text-center text-sm">Sin resultados</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Bodega</TableHead>
                                    <TableHead>Etiqueta</TableHead>
                                    <TableHead>Item</TableHead>
                                    <TableHead>Prod</TableHead>
                                    <TableHead>Ubicaciones</TableHead>
                                    <TableHead>Rack</TableHead>
                                    {mostrarLado && <TableHead>Lado</TableHead>}
                                    <TableHead>Altura</TableHead>
                                    <TableHead>Ubicación</TableHead>
                                    <TableHead>Lote</TableHead>
                                    <TableHead>Descripción</TableHead>
                                    <TableHead>Udm</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {itemsVista.map((it: any) => {
                                    const b = N(it?.bodega);
                                    const ubic = N(it?.ubicacion);
                                    const item = N(it?.item);
                                    const lote = N(it?.lote);

                                    const dupKey =
                                        dupMode === ""
                                            ? ""
                                            : dupMode === "UI"
                                                ? `${ubic}::${item}`
                                                : `${ubic}::${item}::${lote}`;

                                    const veces = dupKey ? dupCount.get(dupKey) ?? 0 : 0;

                                    return (
                                        <TableRow key={`${b}-${ubic}-${item}-${lote}-${it?.etiqueta ?? ""}`}>
                                            <TableCell>{b}</TableCell>
                                            <TableCell>{(it?.etiqueta ?? "").toString().trim()}</TableCell>

                                            <TableCell className="font-mono">
                                                {item}
                                                {dupMode !== "" && veces > 1 ? (
                                                    <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border bg-amber-50 border-amber-200 text-amber-900">
                            repetido x{veces}
                          </span>
                                                ) : null}
                                            </TableCell>

                                            <TableCell>{(it?.prod ?? "").toString().trim()}</TableCell>
                                            <TableCell className="font-mono">{ubic}</TableCell>
                                            <TableCell>{(it?.rackPasillo ?? "").toString().trim()}</TableCell>
                                            {mostrarLado && <TableCell>{(it?.lado ?? "").toString().trim()}</TableCell>}
                                            <TableCell>{(it?.altura ?? "").toString().trim()}</TableCell>
                                            <TableCell>{(it?.posicion ?? "").toString().trim()}</TableCell>
                                            <TableCell>{(it?.lote ?? "").toString().trim()}</TableCell>
                                            <TableCell>{(it?.descripcion ?? "").toString().trim()}</TableCell>
                                            <TableCell>{(it?.udm ?? "").toString().trim()}</TableCell>

                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-xs text-red-600"
                                                    onClick={() => handleQuitarUbicacion(it.bodega, it.ubicacion)}
                                                    disabled={!grupo}
                                                >
                                                    Quitar ubicación del grupo
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </div>

                {grupo && (
                    <GrupoUbicacionesAgregarDialog
                        open={agregarOpen}
                        grupo={grupo}
                        onClose={() => setAgregarOpen(false)}
                        onAfterAdd={load}
                        onSetParentError={setError}
                    />
                )}
            </DialogContent>
        </Dialog>
    );
}
