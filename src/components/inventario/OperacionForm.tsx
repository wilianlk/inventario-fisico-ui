import { ChangeEvent, useMemo, useState } from "react";
import { CrearOperacionRequest } from "@/services/inventarioService";
import { GrupoConteo } from "@/services/grupoConteoService";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ErroresForm {
    fecha?: string;
    gruposIds?: string;
}

interface OperacionFormProps {
    form: CrearOperacionRequest;
    onChangeForm: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    gruposDisponibles: GrupoConteo[];
    onToggleGrupo: (grupoId: number, checked: boolean) => void;
    onNumeroConteoChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    conteoForzado?: number;
    onCrear: () => void;
    loading: boolean;
    canCreate?: boolean;
    errores?: ErroresForm;
    disabledFields?: {
        fecha?: boolean;
        observaciones?: boolean;
        grupos?: boolean;
        numeroConteo?: boolean;
    };
    hideSubmit?: boolean;
}

const OperacionForm = ({
                           form,
                           onChangeForm,
                           gruposDisponibles,
                           onToggleGrupo,
                           onNumeroConteoChange,
                           conteoForzado,
                           onCrear,
                           loading,
                           canCreate,
                           errores = {},
                           disabledFields = {},
                           hideSubmit = false,
                       }: OperacionFormProps) => {
    const [qGrupos, setQGrupos] = useState("");
    const [selectorOpen, setSelectorOpen] = useState(false);

    const idsSel = useMemo(() => new Set<number>(form.gruposIds || []), [form.gruposIds]);
    const isGrupoBloqueado = (g: GrupoConteo) => g?.tieneConteoAbierto === true;

    const gruposFiltrados = useMemo(() => {
        const lista = Array.isArray(gruposDisponibles) ? gruposDisponibles : [];
        const q = qGrupos.trim().toLowerCase();
        if (!q) return lista;

        return lista.filter((g) => {
            const nombre = String((g as any)?.nombre ?? "").toLowerCase();
            const id = String((g as any)?.id ?? "");
            return nombre.includes(q) || id.includes(q);
        });
    }, [gruposDisponibles, qGrupos]);

    const gruposOrdenados = useMemo(() => {
        const lista = Array.isArray(gruposFiltrados) ? gruposFiltrados : [];
        const sel: GrupoConteo[] = [];
        const noSel: GrupoConteo[] = [];
        for (const g of lista) {
            if (idsSel.has(g.id)) sel.push(g);
            else noSel.push(g);
        }
        return [...sel, ...noSel];
    }, [gruposFiltrados, idsSel]);

    const gruposSeleccionados = useMemo(() => {
        const lista = Array.isArray(gruposDisponibles) ? gruposDisponibles : [];
        return lista.filter((g) => idsSel.has(g.id));
    }, [gruposDisponibles, idsSel]);

    const totalGrupos = Array.isArray(gruposDisponibles) ? gruposDisponibles.length : 0;
    const selCount = (form.gruposIds || []).length;

    const seleccionarTodos = () => {
        const lista = Array.isArray(gruposDisponibles) ? gruposDisponibles : [];
        for (const g of lista) {
            if (!isGrupoBloqueado(g)) onToggleGrupo(g.id, true);
        }
    };

    const limpiarSeleccion = () => {
        const lista = Array.isArray(gruposDisponibles) ? gruposDisponibles : [];
        for (const g of lista) if (idsSel.has(g.id)) onToggleGrupo(g.id, false);
    };

    const disabledCrear = loading || (typeof canCreate === "boolean" ? !canCreate : false);

    return (
        <>
        <Card>
            <CardHeader className="text-center">
                <CardTitle>Nueva operación</CardTitle>
            </CardHeader>

            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Fecha de corte *</label>
                    <Input
                        type="date"
                        name="fecha"
                        value={form.fecha}
                        onChange={onChangeForm}
                        disabled={!!disabledFields.fecha}
                        className={errores.fecha ? "border-red-500 focus-visible:ring-red-500" : ""}
                    />
                    {errores.fecha ? <p className="text-xs text-red-600 mt-1">{errores.fecha}</p> : null}
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">Número de conteo *</label>

                    {typeof conteoForzado === "number" && Number.isFinite(conteoForzado) ? (
                        <Input value={`Conteo ${conteoForzado}`} disabled />
                    ) : (
                        <select
                            className="h-9 border rounded-md px-2 text-sm w-full bg-white"
                            value={form.numeroConteo}
                            onChange={onNumeroConteoChange}
                            disabled={!!disabledFields.numeroConteo}
                        >
                            <option value={1}>Conteo 1</option>
                            <option value={2}>Conteo 2</option>
                            <option value={3}>Conteo 3</option>
                        </select>
                    )}
                </div>

                <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium text-slate-600">Observaciones</label>
                    <Input
                        name="observaciones"
                        placeholder="Comentarios adicionales"
                        value={form.observaciones || ""}
                        onChange={onChangeForm}
                        disabled={!!disabledFields.observaciones}
                    />
                </div>

                <div className="space-y-2 md:col-span-2">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <label className="text-xs font-medium text-slate-600">Grupos responsables *</label>

                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600">
                                {selCount}/{totalGrupos}
                            </span>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={seleccionarTodos}
                                disabled={!!disabledFields.grupos}
                            >
                                Todos
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={limpiarSeleccion}
                                disabled={!!disabledFields.grupos}
                            >
                                Limpiar
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={() => setSelectorOpen(true)}
                                disabled={!!disabledFields.grupos}
                            >
                                Elegir grupos
                            </Button>
                        </div>
                    </div>

                    <div className="rounded-md border border-slate-200 bg-white p-2">
                        <div className="text-xs text-slate-500 mb-1">Seleccionados</div>
                        {gruposSeleccionados.length === 0 ? (
                            <div className="text-xs text-slate-400">Aún no has seleccionado grupos.</div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {gruposSeleccionados.map((g) => (
                                    <button
                                        key={g.id}
                                        type="button"
                                        className="flex items-center gap-2 rounded-full border bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                        onClick={() => onToggleGrupo(g.id, false)}
                                        disabled={!!disabledFields.grupos}
                                    >
                                        <span className="font-mono">#{g.id}</span>
                                        <span className="truncate max-w-[180px]">{g.nombre}</span>
                                        <span className="text-slate-400">x</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {!Array.isArray(gruposDisponibles) || gruposDisponibles.length === 0 ? (
                        <p className="text-xs text-slate-500">
                            No hay grupos disponibles. Crea grupos en la pantalla correspondiente.
                        </p>
                    ) : (
                        <div
                            className={`rounded-md border p-2 ${
                                errores.gruposIds ? "border-red-300 bg-red-50/40" : "border-slate-200"
                            }`}
                        >
                            <div className="text-xs text-slate-500">
                                Usa "Elegir grupos" para seleccionar desde la lista completa.
                            </div>
                            {errores.gruposIds ? <p className="text-xs text-red-600 mt-2">{errores.gruposIds}</p> : null}
                        </div>
                    )}
                </div>

                {!hideSubmit ? (
                    <div className="md:col-span-2 flex justify-center">
                        <Button onClick={onCrear} disabled={disabledCrear}>
                            {loading ? "Creando..." : "Crear operación"}
                        </Button>
                    </div>
                ) : null}
            </CardContent>
        </Card>

        <Dialog
            open={selectorOpen && !disabledFields.grupos}
            onOpenChange={(v) => {
                if (disabledFields.grupos) return;
                setSelectorOpen(v);
            }}
        >
            <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Seleccionar grupos</DialogTitle>
                </DialogHeader>

                {!Array.isArray(gruposDisponibles) || gruposDisponibles.length === 0 ? (
                    <p className="text-xs text-slate-500">
                        No hay grupos disponibles. Crea grupos en la pantalla correspondiente.
                    </p>
                ) : (
                    <div className="space-y-3">
                        <Input
                            value={qGrupos}
                            onChange={(e) => setQGrupos(e.target.value)}
                            placeholder="Buscar por nombre o ID..."
                            className="h-9"
                        />

                        <div className="max-h-[50vh] overflow-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {gruposOrdenados.map((g) => {
                                    const checked = idsSel.has(g.id);
                                    const bloqueado = isGrupoBloqueado(g);
                                    const opId = g.operacionIdConteoAbierto;
                                    return (
                                        <label
                                            key={g.id}
                                            className={`flex items-center gap-2 rounded-md border px-2 py-1 text-sm ${
                                                checked ? "bg-slate-50" : "bg-white"
                                            } ${bloqueado ? "opacity-60 cursor-not-allowed" : ""}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                disabled={bloqueado}
                                                onChange={(e) => onToggleGrupo(g.id, e.target.checked)}
                                            />
                                            <span className="min-w-[46px] text-xs text-slate-500">#{g.id}</span>
                                            <span className="truncate">{g.nombre}</span>
                                            {bloqueado && (
                                                <span className="ml-auto text-[10px] text-amber-700">
                                                    Asignado a conteo abierto
                                                        {opId ? ` (Operación: ${opId})` : ""}
                                                </span>
                                            )}
                                        </label>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSelectorOpen(false)}>
                        Cerrar
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
        </>
    );
};

export default OperacionForm;

