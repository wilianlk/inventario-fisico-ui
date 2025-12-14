import { ChangeEvent } from "react";
import { CrearOperacionRequest } from "@/services/inventarioService";
import { GrupoConteo } from "@/services/grupoConteoService";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface ErroresForm {
    bodega?: string;
    tipo?: string;
    fecha?: string;
}

interface OperacionFormProps {
    form: CrearOperacionRequest;
    onChangeForm: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    gruposDisponibles: GrupoConteo[];
    onToggleGrupo: (grupoId: number, checked: boolean) => void;
    onNumeroConteoChange: (e: ChangeEvent<HTMLSelectElement>) => void;
    onCrear: () => void;
    loading: boolean;
    errores?: ErroresForm;
}

const OperacionForm = ({
                           form,
                           onChangeForm,
                           gruposDisponibles,
                           onToggleGrupo,
                           onNumeroConteoChange,
                           onCrear,
                           loading,
                           errores = {},
                       }: OperacionFormProps) => {
    return (
        <Card>
            <CardHeader className="text-center">
                <CardTitle>Nueva operación</CardTitle>
            </CardHeader>

            <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                        Bodega *
                    </label>
                    <select
                        name="bodega"
                        value={form.bodega}
                        onChange={onChangeForm}
                        className={`border rounded px-2 py-1 text-sm w-full ${
                            errores.bodega ? "border-red-500" : ""
                        }`}
                    >
                        <option value="">Seleccione bodega</option>
                        <option value="13M">13M - CCL</option>
                        <option value="11">11 - Recamier</option>
                    </select>
                    {errores.bodega && (
                        <p className="text-xs text-red-500 mt-1">
                            {errores.bodega}
                        </p>
                    )}
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                        Tipo de inventario *
                    </label>
                    <Input
                        name="tipo"
                        placeholder="Ej: GENERAL / CÍCLICO"
                        value={form.tipo}
                        onChange={onChangeForm}
                        className={errores.tipo ? "border-red-500" : ""}
                    />
                    {errores.tipo && (
                        <p className="text-xs text-red-500 mt-1">
                            {errores.tipo}
                        </p>
                    )}
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                        Fecha de corte *
                    </label>
                    <Input
                        type="date"
                        name="fecha"
                        value={form.fecha}
                        onChange={onChangeForm}
                        className={errores.fecha ? "border-red-500" : ""}
                    />
                    {errores.fecha && (
                        <p className="text-xs text-red-500 mt-1">
                            {errores.fecha}
                        </p>
                    )}
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-600">
                        Número de conteo *
                    </label>
                    <select
                        className="border rounded px-2 py-1 text-sm w-full"
                        value={form.numeroConteo}
                        onChange={onNumeroConteoChange}
                    >
                        <option value={1}>Conteo 1</option>
                        <option value={2}>Conteo 2</option>
                    </select>
                </div>

                <div className="space-y-1 md:col-span-1">
                    <label className="text-xs font-medium text-slate-600">
                        Observaciones
                    </label>
                    <Input
                        name="observaciones"
                        placeholder="Comentarios adicionales"
                        value={form.observaciones || ""}
                        onChange={onChangeForm}
                    />
                </div>

                <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-medium text-slate-600">
                        Grupos responsables *
                    </label>
                    {!Array.isArray(gruposDisponibles) ||
                    gruposDisponibles.length === 0 ? (
                        <p className="text-xs text-slate-500">
                            No hay grupos disponibles. Crea grupos en la pantalla
                            correspondiente.
                        </p>
                    ) : (
                        <div className="flex flex-wrap gap-3">
                            {gruposDisponibles.map((g) => (
                                <label
                                    key={g.id}
                                    className="flex items-center gap-2 text-sm border rounded px-2 py-1"
                                >
                                    <input
                                        type="checkbox"
                                        checked={form.gruposIds.includes(g.id)}
                                        onChange={(e) =>
                                            onToggleGrupo(g.id, e.target.checked)
                                        }
                                    />
                                    <span>{g.nombre}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>

                <div className="md:col-span-2 flex justify-center">
                    <Button onClick={onCrear} disabled={loading}>
                        {loading ? "Creando..." : "Crear operación"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

export default OperacionForm;
