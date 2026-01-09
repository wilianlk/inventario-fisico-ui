import { useState, type FormEvent, useMemo } from "react";
import { GrupoConteo } from "@/services/grupoConteoService";
import {
    previsualizarItems,
    agregarUbicacionesAlGrupo,
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

type Bodega = "" | "11" | "13M";

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
    const [bodega, setBodega] = useState<Bodega>("");

    const [rack11, setRack11] = useState("");
    const [altura11, setAltura11] = useState("");
    const [ubic11, setUbic11] = useState("");

    const [rack13, setRack13] = useState("");
    const [lado13, setLado13] = useState<"" | "A" | "B">("");
    const [altura13, setAltura13] = useState("");
    const [ubic13, setUbic13] = useState("");

    const [previewItems, setPreviewItems] = useState<ItemPhystag[]>([]);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState<string | null>(null);
    const [agregando, setAgregando] = useState(false);

    const N = (s: any) => (s ?? "").toString().trim().toUpperCase();

    const reset = () => {
        setBodega("");
        setRack11("");
        setAltura11("");
        setUbic11("");

        setRack13("");
        setLado13("");
        setAltura13("");
        setUbic13("");

        setPreviewItems([]);
        setPreviewError(null);
        setPreviewLoading(false);
        setAgregando(false);
    };

    const clearResultados = () => {
        setPreviewItems([]);
        setPreviewError(null);
    };

    const handleOpenChange = (value: boolean) => {
        if (!value) {
            reset();
            onClose();
        }
    };

    const extraerMsgError = (err: any, fallback: string) => {
        const data = err?.response?.data;
        if (typeof data === "string" && data.trim()) return data;
        return data?.mensaje || data?.message || fallback;
    };

    const buildParams = () => {
        if (!bodega) return null;

        if (bodega === "11") {
            return {
                bodega,
                rack: N(rack11) || undefined,
                lado: undefined,
                altura: (altura11 || "").trim() || undefined,
                ubicacion: (ubic11 || "").trim() || undefined,
            };
        }

        return {
            bodega,
            rack: (rack13 || "").trim() || undefined,
            lado: N(lado13) || undefined,
            altura: (altura13 || "").trim() || undefined,
            ubicacion: (ubic13 || "").trim() || undefined,
        };
    };

    const handleBuscar = async (e: FormEvent) => {
        e.preventDefault();

        if (!bodega) {
            setPreviewError("Seleccione una bodega.");
            return;
        }

        clearResultados();

        const params = buildParams();
        if (!params) {
            setPreviewError("Seleccione una bodega.");
            return;
        }

        setPreviewLoading(true);
        setPreviewError(null);

        try {
            const res = await previsualizarItems(params);
            const items = (res?.data || []) as ItemPhystag[];

            setPreviewItems(items);

            if (!items.length) {
                setPreviewError("No se encontraron ítems con ese filtro.");
                return;
            }
        } catch (err: any) {
            setPreviewError(extraerMsgError(err, "Error al buscar."));
        } finally {
            setPreviewLoading(false);
        }
    };

    // ✅ Materializar: de los items previsualizados sacar ubicaciones únicas (tg_bin)
    const ubicacionesMaterializadas = useMemo(() => {
        const map = new Map<string, any>();

        for (const it of previewItems as any[]) {
            const ubicacionCompleta = N(it?.ubicacion); // tg_bin (ej: B301)
            if (!ubicacionCompleta) continue;

            if (!map.has(ubicacionCompleta)) {
                map.set(ubicacionCompleta, {
                    ubicacion: ubicacionCompleta,
                    rack: N(it?.rackPasillo),
                    lado: N(it?.lado) || "",
                    altura: (it?.altura ?? "").toString().trim(),
                    posicion: (it?.posicion ?? "").toString().trim(),
                });
            }
        }

        return Array.from(map.values());
    }, [previewItems]);

    const handleConfirmarAgregar = async () => {
        if (agregando) return;
        if (!bodega) return;

        if (previewItems.length === 0 || ubicacionesMaterializadas.length === 0) {
            const msg = "Primero debes buscar (previsualizar) y tener resultados.";
            setPreviewError(msg);
            toast.warning(msg);
            return;
        }

        setAgregando(true);
        onSetParentError(null);

        try {
            await agregarUbicacionesAlGrupo({
                grupoId: grupo.id,
                bodega,
                ubicaciones: ubicacionesMaterializadas,
            });

            await onAfterAdd();
            toast.success("Ubicaciones agregadas correctamente.");
            reset();
            onClose();
        } catch (err: any) {
            const msg = extraerMsgError(err, "Error al agregar.");
            toast.error("No se pudieron agregar las ubicaciones.");
            onSetParentError(msg);
        } finally {
            setAgregando(false);
        }
    };

    const canBuscar = !previewLoading && !!bodega;
    const canAgregar =
        !agregando && !!bodega && !previewLoading && ubicacionesMaterializadas.length > 0;

    const mostrarLado = bodega === "13M";

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-5xl">
                <DialogHeader>
                    <DialogTitle>Agregar filtro</DialogTitle>
                    <DialogDescription>
                        Selecciona bodega, digita lo que tengas y previsualiza. Luego agrega al grupo
                        las ubicaciones resultantes.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleBuscar} className="space-y-4 mb-3">
                    <div className="space-y-1">
                        <Label className="text-xs text-slate-600">Bodega</Label>
                        <select
                            value={bodega}
                            onChange={(e) => {
                                const val = (e.target.value || "") as Bodega;
                                setBodega(val);

                                setRack11("");
                                setAltura11("");
                                setUbic11("");
                                setRack13("");
                                setLado13("");
                                setAltura13("");
                                setUbic13("");

                                clearResultados();
                            }}
                            className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                        >
                            <option value="">Seleccione…</option>
                            <option value="11">11 – Recamier</option>
                            <option value="13M">13M – CCL</option>
                        </select>
                    </div>

                    {bodega === "11" ? (
                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-600">Rack/Pasillo</Label>
                                <Input
                                    value={rack11}
                                    onChange={(e) => {
                                        setRack11(e.target.value.toUpperCase().slice(0, 1));
                                        clearResultados();
                                    }}
                                    placeholder="Ej: B"
                                    className="text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-600">Altura</Label>
                                <Input
                                    value={altura11}
                                    onChange={(e) => {
                                        setAltura11(e.target.value.replace(/\D/g, "").slice(0, 1));
                                        clearResultados();
                                    }}
                                    placeholder="Ej: 2"
                                    className="text-sm"
                                    inputMode="numeric"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-600">Ubicación</Label>
                                <Input
                                    value={ubic11}
                                    onChange={(e) => {
                                        setUbic11(e.target.value.replace(/\D/g, "").slice(0, 2));
                                        clearResultados();
                                    }}
                                    placeholder="Ej: 31"
                                    className="text-sm"
                                    inputMode="numeric"
                                />
                            </div>
                        </div>
                    ) : bodega === "13M" ? (
                        <div className="grid grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-600">Rack/Pasillo</Label>
                                <Input
                                    value={rack13}
                                    onChange={(e) => {
                                        setRack13(e.target.value.replace(/\D/g, "").slice(0, 2));
                                        clearResultados();
                                    }}
                                    placeholder="Ej: 07"
                                    className="text-sm"
                                    inputMode="numeric"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-600">Lado</Label>
                                <select
                                    value={lado13}
                                    onChange={(e) => {
                                        setLado13((e.target.value || "").toUpperCase() as any);
                                        clearResultados();
                                    }}
                                    className="w-full h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                                >
                                    <option value="">Seleccione…</option>
                                    <option value="A">A</option>
                                    <option value="B">B</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-600">Altura</Label>
                                <Input
                                    value={altura13}
                                    onChange={(e) => {
                                        setAltura13(e.target.value.replace(/\D/g, "").slice(0, 1));
                                        clearResultados();
                                    }}
                                    placeholder="Ej: 6"
                                    className="text-sm"
                                    inputMode="numeric"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-600">Ubicación</Label>
                                <Input
                                    value={ubic13}
                                    onChange={(e) => {
                                        setUbic13(e.target.value.replace(/\D/g, "").slice(0, 2));
                                        clearResultados();
                                    }}
                                    placeholder="Ej: 41"
                                    className="text-sm"
                                    inputMode="numeric"
                                />
                            </div>
                        </div>
                    ) : null}

                    {previewError && (
                        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                            {previewError}
                        </div>
                    )}

                    <div className="flex justify-end">
                        <Button type="submit" size="sm" disabled={!canBuscar}>
                            {previewLoading ? "Buscando..." : "Buscar"}
                        </Button>
                    </div>
                </form>

                {previewItems.length > 0 && (
                    <div className="mb-2 text-xs text-slate-600">
                        Total ítems:{" "}
                        <span className="font-medium text-slate-900">{previewItems.length}</span>
                        {"  "}
                        <span className="ml-3">
              Ubicaciones a guardar:{" "}
                            <span className="font-medium text-slate-900">
                {ubicacionesMaterializadas.length}
              </span>
            </span>
                    </div>
                )}

                {previewItems.length > 0 && (
                    <div className="border border-slate-200 rounded-md max-h-64 overflow-auto mb-4">
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
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {previewItems.map((it) => {
                                    const b = N((it as any).bodega || "");
                                    const etiqueta = ((it as any).etiqueta ?? "").toString().trim();
                                    const item = ((it as any).item ?? "").toString().trim();
                                    const prod = ((it as any).prod ?? "").toString().trim();
                                    const ubicaciones = N((it as any).ubicacion || "");
                                    const rack = ((it as any).rackPasillo ?? "").toString().trim();
                                    const lado = ((it as any).lado ?? "").toString().trim();
                                    const altura = ((it as any).altura ?? "").toString().trim();
                                    const ubicacion = ((it as any).posicion ?? "").toString().trim();
                                    const lote = ((it as any).lote ?? "").toString().trim();
                                    const descripcion = ((it as any).descripcion ?? "").toString().trim();
                                    const udm = ((it as any).udm ?? "").toString().trim();

                                    const key = `${b}-${ubicaciones}-${item}-${lote}-${etiqueta}`;

                                    return (
                                        <TableRow key={key}>
                                            <TableCell className="text-xs">{b}</TableCell>
                                            <TableCell className="text-xs">{etiqueta}</TableCell>
                                            <TableCell className="font-mono text-xs">{item}</TableCell>
                                            <TableCell className="text-xs">{prod}</TableCell>
                                            <TableCell className="font-mono text-xs">{ubicaciones}</TableCell>
                                            <TableCell className="text-xs">{rack}</TableCell>
                                            {mostrarLado && <TableCell className="text-xs">{lado}</TableCell>}
                                            <TableCell className="text-xs">{altura}</TableCell>
                                            <TableCell className="text-xs">{ubicacion}</TableCell>
                                            <TableCell className="text-xs">{lote}</TableCell>
                                            <TableCell className="text-xs">{descripcion}</TableCell>
                                            <TableCell className="text-xs">{udm}</TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenChange(false)}>
                        Cancelar
                    </Button>
                    <Button size="sm" disabled={!canAgregar} onClick={handleConfirmarAgregar}>
                        {agregando ? "Agregando..." : "Agregar al grupo"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
