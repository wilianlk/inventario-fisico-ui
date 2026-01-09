import { ChangeEvent, useMemo, useState } from "react";
import { CrearOperacionRequest } from "@/services/inventarioService";
import { GrupoConteo } from "@/services/grupoConteoService";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
                       }: OperacionFormProps) => {
    const [qGrupos, setQGrupos] = useState("");

    const idsSel = useMemo(() => new Set<number>(form.gruposIds || []), [form.gruposIds]);

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

    const totalGrupos = Array.isArray(gruposDisponibles) ? gruposDisponibles.length : 0;
    const selCount = (form.gruposIds || []).length;

    const seleccionarTodos = () => {
        const lista = Array.isArray(gruposDisponibles) ? gruposDisponibles : [];
        for (const g of lista) onToggleGrupo(g.id, true);
    };

    const limpiarSeleccion = () => {
        const lista = Array.isArray(gruposDisponibles) ? gruposDisponibles : [];
        for (const g of lista) if (idsSel.has(g.id)) onToggleGrupo(g.id, false);
    };

    const disabledCrear = loading || (typeof canCreate === "boolean" ? !canCreate : false);

    return (
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
                            >
                                Todos
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8 px-3 text-xs"
                                onClick={limpiarSeleccion}
                            >
                                Limpiar
                            </Button>
                        </div>
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
                            <Input
                                value={qGrupos}
                                onChange={(e) => setQGrupos(e.target.value)}
                                placeholder="Buscar por nombre o ID…"
                                className="h-9"
                            />

                            <div className="mt-2 max-h-56 overflow-auto">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                    {gruposOrdenados.map((g) => {
                                        const checked = idsSel.has(g.id);
                                        return (
                                            <label
                                                key={g.id}
                                                className={`flex items-center gap-2 rounded-md border px-2 py-1 text-sm ${
                                                    checked ? "bg-slate-50" : "bg-white"
                                                }`}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={checked}
                                                    onChange={(e) => onToggleGrupo(g.id, e.target.checked)}
                                                />
                                                <span className="min-w-[46px] text-xs text-slate-500">#{g.id}</span>
                                                <span className="truncate">{g.nombre}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>

                            {errores.gruposIds ? <p className="text-xs text-red-600 mt-2">{errores.gruposIds}</p> : null}
                        </div>
                    )}
                </div>

                <div className="md:col-span-2 flex justify-center">
                    <Button onClick={onCrear} disabled={disabledCrear}>
                        {loading ? "Creando..." : "Crear operación"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default OperacionForm;
