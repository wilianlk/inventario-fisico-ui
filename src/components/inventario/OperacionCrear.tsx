import { useMemo, useState, ChangeEvent, useEffect } from "react";
import { toast } from "react-toastify";

import { crearOperacion, CrearOperacionRequest } from "@/services/inventarioService";
import { GrupoConteo } from "@/services/grupoConteoService";

import OperacionForm from "@/components/inventario/OperacionForm";

interface ErroresForm {
    fecha?: string;
    gruposIds?: string;
}

interface OperacionCrearProps {
    gruposDisponibles: GrupoConteo[];
    onCreated: () => void;
    conteoForzado?: number;
}

const OperacionCrear = ({
    gruposDisponibles,
    onCreated,
    conteoForzado,
}: OperacionCrearProps) => {
    const conteoForzadoValido =
        typeof conteoForzado === "number" && Number.isFinite(conteoForzado) ? Number(conteoForzado) : null;

    const [form, setForm] = useState<CrearOperacionRequest>({
        bodega: "11",
        fecha: "",
        observaciones: "",
        usuarioCreacion: "WILLIAM",
        numeroConteo: conteoForzadoValido ?? 1,
        gruposIds: [],
    });

    const [errores, setErrores] = useState<ErroresForm>({});
    const [loading, setLoading] = useState(false);
    const [submitAttempted, setSubmitAttempted] = useState(false);

    useEffect(() => {
        if (conteoForzadoValido == null) return;
        setForm((prev) => ({
            ...prev,
            bodega: "11",
            numeroConteo: conteoForzadoValido,
        }));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conteoForzadoValido]);

    const canCreate = useMemo(() => {
        const hasFecha = !!form.fecha;
        const nConteo = Number(form.numeroConteo);
        const conteoOk =
            conteoForzadoValido != null
                ? nConteo === Number(conteoForzadoValido)
                : !!form.numeroConteo && [1, 2, 3].includes(nConteo);

        const hasGrupos = Array.isArray(form.gruposIds) && form.gruposIds.length > 0;

        return hasFecha && conteoOk && hasGrupos && !loading;
    }, [form.fecha, form.numeroConteo, form.gruposIds, loading, conteoForzadoValido]);

    const faltantes = useMemo(() => {
        const f: string[] = [];
        if (!form.fecha) f.push("Fecha de corte");
        if (!Array.isArray(form.gruposIds) || form.gruposIds.length === 0) f.push("Grupos responsables");
        return f;
    }, [form.fecha, form.gruposIds]);

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
            numeroConteo: conteoForzadoValido ?? prev.numeroConteo,
            [name]: value,
        }));
    };

    const handleNumeroConteoChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (conteoForzadoValido != null) return;

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
            const next = checked
                ? actual.includes(grupoId)
                    ? actual
                    : [...actual, grupoId]
                : actual.filter((id) => id !== grupoId);

            return { ...prev, bodega: "11", gruposIds: next };
        });

        if (checked || (!checked && (form.gruposIds || []).length > 1)) limpiarErrorCampo("gruposIds");
    };

    const handleCrear = async () => {
        setSubmitAttempted(true);

        const nuevosErrores: ErroresForm = {};
        if (!form.fecha) nuevosErrores.fecha = "La fecha de corte es obligatoria.";
        if (!form.gruposIds || form.gruposIds.length === 0)
            nuevosErrores.gruposIds = "Debe seleccionar al menos un grupo.";

        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            return;
        }

        const nConteo = Number(form.numeroConteo);
        const conteoValido =
            conteoForzadoValido != null
                ? nConteo === Number(conteoForzadoValido)
                : [1, 2, 3].includes(nConteo);

        if (!conteoValido) {
            if (conteoForzadoValido != null) {
                toast.warning(`El conteo debe ser ${conteoForzadoValido} para esta creación.`);
            } else {
                toast.warning("Debes seleccionar un número de conteo válido (1, 2 o 3).");
            }
            return;
        }

        const gruposSeleccionados = [...new Set(form.gruposIds)];

        try {
            setLoading(true);

            const payload: CrearOperacionRequest = {
                ...form,
                bodega: "11",
                numeroConteo: conteoForzadoValido ?? nConteo,
                gruposIds: gruposSeleccionados,
            };

            await crearOperacion(payload);

            toast.success("Operación creada correctamente.");

            setForm((prev) => ({
                ...prev,
                bodega: "11",
                observaciones: "",
                numeroConteo: conteoForzadoValido ?? 1,
                gruposIds: [],
            }));
            setErrores({});
            setSubmitAttempted(false);
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
            {submitAttempted && faltantes.length > 0 ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                    <div className="font-semibold">Faltan datos para crear la operación</div>
                    <ul className="mt-1 list-disc pl-5 text-xs">
                        {faltantes.map((x) => (
                            <li key={x}>{x}</li>
                        ))}
                    </ul>
                </div>
            ) : null}

            <OperacionForm
                form={form}
                onChangeForm={handleChangeForm}
                gruposDisponibles={gruposDisponibles}
                onToggleGrupo={toggleGrupo}
                onNumeroConteoChange={handleNumeroConteoChange}
                conteoForzado={conteoForzadoValido ?? undefined}
                onCrear={handleCrear}
                loading={loading}
                canCreate={canCreate}
                errores={errores}
            />
        </div>
    );
};

export default OperacionCrear;

