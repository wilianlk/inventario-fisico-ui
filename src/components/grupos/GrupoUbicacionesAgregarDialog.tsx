import { useState } from "react";
import { GrupoConteo } from "@/services/grupoConteoService";
import {
    agregarUbicacion,
    buscarUbicaciones,
    obtenerItemsPorUbicacion,
    ItemConUbicacion,
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

type ModoUbicacion = "unico" | "rango";

interface Props {
    open: boolean;
    grupo: GrupoConteo;
    onClose: () => void;
    onAfterAdd: () => void;
    onSetParentError: (msg: string | null) => void;
}

export function GrupoUbicacionesAgregarDialog({
                                                  open,
                                                  grupo,
                                                  onClose,
                                                  onAfterAdd,
                                                  onSetParentError,
                                              }: Props) {
    const [modo, setModo] = useState<ModoUbicacion>("unico");
    const [ubicacionUnica, setUbicacionUnica] = useState("");
    const [ubicacionDesde, setUbicacionDesde] = useState("");
    const [ubicacionHasta, setUbicacionHasta] = useState("");
    const [previewUbicaciones, setPreviewUbicaciones] = useState<string[]>([]);
    const [previewItems, setPreviewItems] = useState<ItemConUbicacion[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [agregando, setAgregando] = useState(false);

    const normalizeUb = (u: string) => (u || "").trim().toUpperCase();

    const uniqueUbs = (arr: string[]) => {
        const norm = arr.map(normalizeUb).filter(Boolean);
        return Array.from(new Set(norm));
    };

    const reset = () => {
        setModo("unico");
        setUbicacionUnica("");
        setUbicacionDesde("");
        setUbicacionHasta("");
        setPreviewUbicaciones([]);
        setPreviewItems([]);
        setPreviewError(null);
        setPreviewLoading(false);
        setAgregando(false);
    };

    const handleOpenChange = (value: boolean) => {
        if (!value) {
            reset();
            onClose();
        }
    };

    const handleBuscar = async (e: React.FormEvent) => {
        e.preventDefault();

        let desde = "";
        let hasta = "";

        if (modo === "unico") {
            if (!ubicacionUnica.trim()) return;
            desde = ubicacionUnica.toUpperCase().trim();
            hasta = desde;
        } else {
            if (!ubicacionDesde.trim() || !ubicacionHasta.trim()) {
                setPreviewError("Debe diligenciar desde y hasta.");
                return;
            }
            desde = ubicacionDesde.toUpperCase().trim();
            hasta = ubicacionHasta.toUpperCase().trim();
        }

        setPreviewLoading(true);
        setPreviewError(null);
        setPreviewItems([]);
        setPreviewUbicaciones([]);

        try {
            const rango = await buscarUbicaciones(desde, hasta);
            const listaRaw: string[] = rango.data || [];
            const lista = uniqueUbs(listaRaw);

            if (!lista || lista.length === 0) {
                setPreviewError("La ubicación no existe en inventario.");
                return;
            }

            const itemsAcumulados: ItemConUbicacion[] = [];
            for (const ub of lista) {
                const itemsUb = await obtenerItemsPorUbicacion(ub);
                itemsAcumulados.push(...itemsUb);
            }

            if (itemsAcumulados.length === 0) {
                setPreviewError("La ubicación no tiene ítems en inventario.");
                return;
            }

            setPreviewUbicaciones(lista);
            setPreviewItems(itemsAcumulados);
        } catch (err: any) {
            const msg =
                err?.response?.data?.mensaje ||
                err?.response?.data?.message ||
                "Error al buscar la ubicación.";
            setPreviewError(msg);
        } finally {
            setPreviewLoading(false);
        }
    };

    const handleConfirmarAgregar = async () => {
        if (agregando) return;

        const ubs = uniqueUbs(previewUbicaciones);
        if (ubs.length === 0) return;

        setAgregando(true);
        onSetParentError(null);

        const agregadas: string[] = [];
        const yaEnGrupo = new Set<string>();
        const otrosErrores: Array<{ ub: string; msg: string }> = [];

        const isYaAsignadaMismoGrupo = (msg: string) => {
            const m = (msg || "").toLowerCase();
            return (
                m.includes("ya está asignada a este grupo") ||
                m.includes("ya esta asignada a este grupo")
            );
        };

        const resumenLista = (arr: string[], max = 12) => {
            const unicas = Array.from(new Set(arr.map(normalizeUb).filter(Boolean))).sort();
            if (unicas.length <= max) return unicas.join(", ");
            return `${unicas.slice(0, max).join(", ")} y ${unicas.length - max} más`;
        };

        try {
            for (const ub of ubs) {
                try {
                    await agregarUbicacion(grupo.id, ub);
                    agregadas.push(ub);
                } catch (err: any) {
                    const msg =
                        err?.response?.data?.mensaje ||
                        err?.response?.data?.message ||
                        "Error al agregar ubicación.";

                    if (isYaAsignadaMismoGrupo(msg)) {
                        yaEnGrupo.add(ub);
                    } else {
                        otrosErrores.push({ ub, msg });
                    }
                }
            }

            await onAfterAdd();

            if (agregadas.length > 0) {
                toast.success(`Se agregaron ${agregadas.length} ubicación(es).`);
            }

            let msgFinal = "";

            const yaList = Array.from(yaEnGrupo);
            if (yaList.length > 0) {
                const r = resumenLista(yaList);
                msgFinal += `Ya estaban en este grupo (${yaList.length}): ${r}.`;
                toast.info(`Ya estaban en este grupo: ${r}.`);
            }

            if (otrosErrores.length > 0) {
                const unicos = new Map<string, string>();
                for (const e of otrosErrores) {
                    if (!unicos.has(e.ub)) unicos.set(e.ub, e.msg);
                }

                const lineas = Array.from(unicos.entries())
                    .slice(0, 10)
                    .map(([ub, msg]) => `• ${ub}: ${msg}`)
                    .join("\n");

                const extra = unicos.size > 10 ? `\n• y ${unicos.size - 10} más.` : "";

                msgFinal += (msgFinal ? "\n\n" : "") + `Errores al agregar (${unicos.size}):\n${lineas}${extra}`;
                toast.error(`Hubo ${unicos.size} error(es) al agregar.`);
            }

            if (msgFinal) {
                onSetParentError(msgFinal);
                return;
            }

            reset();
            onClose();
        } finally {
            setAgregando(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Agregar ubicación</DialogTitle>
                    <DialogDescription>
                        Elige si quieres agregar una única ubicación o un rango, revisa los ítems y confirma.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleBuscar} className="space-y-4 mb-3">
                    <div className="flex gap-4 text-sm">
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                type="radio"
                                value="unico"
                                checked={modo === "unico"}
                                onChange={() => setModo("unico")}
                            />
                            Único
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                            <input
                                type="radio"
                                value="rango"
                                checked={modo === "rango"}
                                onChange={() => setModo("rango")}
                            />
                            Rango
                        </label>
                    </div>

                    {modo === "unico" ? (
                        <div className="space-y-1">
                            <Label htmlFor="ubicacionUnica" className="text-xs text-slate-600">
                                Ubicación
                            </Label>
                            <Input
                                id="ubicacionUnica"
                                className="text-sm"
                                value={ubicacionUnica}
                                onChange={(e) => setUbicacionUnica(e.target.value)}
                                placeholder="Ej: E202"
                            />
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <div className="flex-1 space-y-1">
                                <Label htmlFor="ubicacionDesde" className="text-xs text-slate-600">
                                    Desde
                                </Label>
                                <Input
                                    id="ubicacionDesde"
                                    className="text-sm"
                                    value={ubicacionDesde}
                                    onChange={(e) => setUbicacionDesde(e.target.value)}
                                    placeholder="Ej: E202"
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <Label htmlFor="ubicacionHasta" className="text-xs text-slate-600">
                                    Hasta
                                </Label>
                                <Input
                                    id="ubicacionHasta"
                                    className="text-sm"
                                    value={ubicacionHasta}
                                    onChange={(e) => setUbicacionHasta(e.target.value)}
                                    placeholder="Ej: E205"
                                />
                            </div>
                        </div>
                    )}

                    {previewError && (
                        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                            {previewError}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            size="sm"
                            disabled={
                                previewLoading ||
                                (modo === "unico" && !ubicacionUnica.trim()) ||
                                (modo === "rango" &&
                                    (!ubicacionDesde.trim() || !ubicacionHasta.trim()))
                            }
                        >
                            {previewLoading ? "Buscando..." : "Buscar"}
                        </Button>
                    </div>
                </form>

                {previewItems.length > 0 && (
                    <div className="border border-slate-200 rounded-md max-h-48 overflow-y-auto mb-4">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ubicación</TableHead>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Descripción</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {previewItems.map((it) => (
                                    <TableRow key={`${it.ubicacion}-${it.item}`}>
                                        <TableCell className="text-xs">
                                            {it.ubicacion.trim()}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {it.item.trim()}
                                        </TableCell>
                                        <TableCell className="text-xs">
                                            {it.descripcion.trim()}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenChange(false)}
                    >
                        Cancelar
                    </Button>
                    <Button
                        size="sm"
                        disabled={
                            agregando ||
                            previewLoading ||
                            previewItems.length === 0 ||
                            previewUbicaciones.length === 0
                        }
                        onClick={handleConfirmarAgregar}
                    >
                        {agregando ? "Agregando..." : "Agregar al grupo"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
