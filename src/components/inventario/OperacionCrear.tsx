import { useMemo, useState, ChangeEvent } from "react";
import { toast } from "react-toastify";

import { crearOperacion, CrearOperacionRequest } from "@/services/inventarioService";
import { GrupoConteo } from "@/services/grupoConteoService";

import OperacionForm from "@/components/inventario/OperacionForm";

interface ErroresForm {
    fecha?: string;
}

interface OperacionCrearProps {
    gruposDisponibles: GrupoConteo[];
    onCreated: () => void;
}

type EnlaceGrupo = {
    grupoId: number;
    nombre: string;
    url: string;
};

type EnlacesOperacion = {
    operacionId: number;
    numeroConteo: number;
    enlaces: EnlaceGrupo[];
};

const OperacionCrear = ({ gruposDisponibles, onCreated }: OperacionCrearProps) => {
    const [form, setForm] = useState<CrearOperacionRequest>({
        bodega: "11",
        fecha: "",
        observaciones: "",
        usuarioCreacion: "WILLIAM",
        numeroConteo: 1,
        gruposIds: [],
    });

    const [errores, setErrores] = useState<ErroresForm>({});
    const [loading, setLoading] = useState(false);
    const [enlacesOperacion, setEnlacesOperacion] = useState<EnlacesOperacion | null>(null);

    const canCreate = useMemo(() => {
        const hasFecha = !!form.fecha;
        const conteoOk = !!form.numeroConteo && [1, 2].includes(form.numeroConteo);
        const hasGrupos = Array.isArray(form.gruposIds) && form.gruposIds.length > 0;
        return hasFecha && conteoOk && hasGrupos && !loading;
    }, [form.fecha, form.numeroConteo, form.gruposIds, loading]);

    const gruposWarning =
        !Array.isArray(form.gruposIds) || form.gruposIds.length === 0
            ? "Debe seleccionar al menos un grupo para crear la operación."
            : "";

    const limpiarErrorCampo = (campo: keyof ErroresForm) => {
        setErrores((prev) => {
            const { [campo]: _, ...resto } = prev;
            return resto;
        });
    };

    const handleChangeForm = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === "fecha") limpiarErrorCampo("fecha");

        setForm((prev) => ({
            ...prev,
            bodega: "11",
            [name]: value,
        }));
    };

    const handleNumeroConteoChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const valor = Number(e.target.value) || 1;
        setForm((prev) => ({
            ...prev,
            bodega: "11",
            numeroConteo: valor,
        }));
    };

    const toggleGrupo = (grupoId: number, checked: boolean) => {
        setForm((prev) => {
            const actual = prev.gruposIds || [];
            if (checked) {
                if (actual.includes(grupoId)) return prev;
                return { ...prev, bodega: "11", gruposIds: [...actual, grupoId] };
            }
            return {
                ...prev,
                bodega: "11",
                gruposIds: actual.filter((id) => id !== grupoId),
            };
        });
    };

    const copiar = async (texto: string) => {
        try {
            await navigator.clipboard.writeText(texto);
            toast.success("Enlace copiado.");
        } catch {
            toast.error("No se pudo copiar el enlace.");
        }
    };

    const handleCrear = async () => {
        const nuevosErrores: ErroresForm = {};

        if (!form.fecha) nuevosErrores.fecha = "La fecha de corte es obligatoria.";

        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            return;
        }

        if (!form.numeroConteo || ![1, 2].includes(form.numeroConteo)) {
            toast.warning("Debes seleccionar un número de conteo válido (1 o 2).");
            return;
        }

        if (!form.gruposIds || form.gruposIds.length === 0) {
            toast.warning("Debe seleccionar al menos un grupo para crear la operación.");
            return;
        }

        const gruposSeleccionados = [...new Set(form.gruposIds)];

        try {
            setLoading(true);

            const res: any = await crearOperacion({ ...form, bodega: "11" });

            const operacionId =
                Number(res?.id) ||
                Number(res?.data?.id) ||
                Number(res?.operacionId) ||
                Number(res?.data?.operacionId);

            toast.success("Operación creada correctamente.");

            if (Number.isFinite(operacionId) && operacionId > 0) {
                const origin = window.location.origin;
                const enlaces: EnlaceGrupo[] = gruposSeleccionados.map((gid) => {
                    const g = gruposDisponibles.find((x: any) => x.id === gid);
                    return {
                        grupoId: gid,
                        nombre: (g as any)?.nombre || `Grupo ${gid}`,
                        url: `${origin}/conteo/${operacionId}/${gid}`,
                    };
                });

                setEnlacesOperacion({
                    operacionId,
                    numeroConteo: form.numeroConteo || 1,
                    enlaces,
                });
            } else {
                setEnlacesOperacion(null);
                toast.warning("No se pudo obtener el ID de la operación para generar enlaces.");
            }

            setForm((prev) => ({
                ...prev,
                bodega: "11",
                observaciones: "",
                numeroConteo: 1,
                gruposIds: [],
            }));
            setErrores({});
            onCreated();
        } catch (error: any) {
            console.error(error);
            const msg =
                error?.response?.data?.mensaje ||
                error?.response?.data?.message ||
                error?.response?.data ||
                "No se pudo crear la operación.";
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-3">
            {gruposWarning ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                    {gruposWarning}
                </div>
            ) : null}

            <OperacionForm
                form={form}
                onChangeForm={handleChangeForm}
                gruposDisponibles={gruposDisponibles}
                onToggleGrupo={toggleGrupo}
                onNumeroConteoChange={handleNumeroConteoChange}
                onCrear={handleCrear}
                loading={!canCreate}
                errores={errores}
            />

            {enlacesOperacion ? (
                <div className="rounded-xl border bg-white p-4 shadow-sm space-y-3">
                    <div className="text-center">
                        <div className="text-sm text-slate-600">Enlaces para tablets</div>
                        <div className="text-base font-semibold text-slate-900">
                            Operación {enlacesOperacion.operacionId} · Conteo {enlacesOperacion.numeroConteo}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {enlacesOperacion.enlaces.map((e) => (
                            <div
                                key={e.grupoId}
                                className="flex flex-col gap-2 rounded-lg border bg-white p-3 md:flex-row md:items-center"
                            >
                                <div className="min-w-[160px] text-sm font-medium text-slate-800">{e.nombre}</div>

                                <input
                                    readOnly
                                    value={e.url}
                                    className="w-full rounded-md border bg-slate-50 px-3 py-2 font-mono text-xs text-slate-900"
                                />

                                <div className="flex gap-2 md:justify-end">
                                    <button
                                        type="button"
                                        className="h-8 rounded-md bg-slate-900 px-3 text-xs font-semibold text-white hover:bg-slate-800"
                                        onClick={() => copiar(e.url)}
                                    >
                                        Copiar
                                    </button>
                                    <button
                                        type="button"
                                        className="h-8 rounded-md border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-900 hover:bg-slate-50"
                                        onClick={() => window.open(e.url, "_blank")}
                                    >
                                        Abrir
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}
        </div>
    );
};

export default OperacionCrear;
