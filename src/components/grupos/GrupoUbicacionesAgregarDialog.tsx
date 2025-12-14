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
            const lista: string[] = rango.data || [];

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
        if (previewUbicaciones.length === 0) return;

        setAgregando(true);
        onSetParentError(null);

        const fallidas: string[] = [];
        const otrosErrores: string[] = [];

        try {
            for (const ub of previewUbicaciones) {
                try {
                    await agregarUbicacion(grupo.id, ub);
                } catch (err: any) {
                    const msg =
                        err?.response?.data?.mensaje ||
                        err?.response?.data?.message ||
                        "Error al agregar ubicación.";

                    if (msg.includes("ya está asignada") || msg.includes("ya esta asignada")) {
                        fallidas.push(`${ub}: ${msg}`);
                    } else {
                        otrosErrores.push(`${ub}: ${msg}`);
                    }
                }
            }

            await onAfterAdd();

            const agregadas = previewUbicaciones.filter(
                (u) => !fallidas.some((f) => f.startsWith(`${u}:`))
            );

            if (agregadas.length > 0) {
                toast.success(
                    `Se agregaron ${agregadas.length} ubicación(es): ${agregadas.join(", ")}.`
                );
            }

            let msgFinal = "";

            if (fallidas.length > 0) {
                msgFinal +=
                    "No se pudieron agregar estas ubicaciones porque ya están asignadas: " +
                    fallidas.join(" | ");
            }

            if (otrosErrores.length > 0) {
                if (msgFinal) msgFinal += " ";
                msgFinal += "Errores adicionales: " + otrosErrores.join(" | ");
            }

            if (msgFinal) {
                onSetParentError(msgFinal);
                toast.warn(msgFinal);
            } else {
                reset();
                onClose();
            }
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
