import { useState, ChangeEvent } from "react";
import { toast } from "react-toastify";

import {
    crearOperacion,
    CrearOperacionRequest,
} from "@/services/inventarioService";
import { GrupoConteo } from "@/services/grupoConteoService";

import OperacionForm from "@/components/inventario/OperacionForm";

interface ErroresForm {
    bodega?: string;
    tipo?: string;
    fecha?: string;
}

interface OperacionCrearProps {
    gruposDisponibles: GrupoConteo[];
    onCreated: () => void;
}

const OperacionCrear = ({ gruposDisponibles, onCreated }: OperacionCrearProps) => {
    const [form, setForm] = useState<CrearOperacionRequest>({
        bodega: "",
        tipo: "",
        fecha: "",
        observaciones: "",
        usuarioCreacion: "WILLIAM",
        numeroConteo: 1,
        gruposIds: [],
    });

    const [errores, setErrores] = useState<ErroresForm>({});
    const [loading, setLoading] = useState(false);

    const limpiarErrorCampo = (campo: keyof ErroresForm) => {
        setErrores((prev) => {
            const { [campo]: _, ...resto } = prev;
            return resto;
        });
    };

    const handleChangeForm = (
        e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target;

        if (name === "bodega" || name === "tipo" || name === "fecha") {
            limpiarErrorCampo(name as keyof ErroresForm);
        }

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleNumeroConteoChange = (e: ChangeEvent<HTMLSelectElement>) => {
        const valor = Number(e.target.value) || 1;
        setForm((prev) => ({
            ...prev,
            numeroConteo: valor,
        }));
    };

    const toggleGrupo = (grupoId: number, checked: boolean) => {
        setForm((prev) => {
            const actual = prev.gruposIds || [];
            if (checked) {
                if (actual.includes(grupoId)) return prev;
                return { ...prev, gruposIds: [...actual, grupoId] };
            }
            return {
                ...prev,
                gruposIds: actual.filter((id) => id !== grupoId),
            };
        });
    };

    const handleCrear = async () => {
        const nuevosErrores: ErroresForm = {};

        if (!form.bodega) {
            nuevosErrores.bodega = "La bodega es obligatoria.";
        }

        if (!form.tipo) {
            nuevosErrores.tipo = "El tipo de inventario es obligatorio.";
        }

        if (!form.fecha) {
            nuevosErrores.fecha = "La fecha de corte es obligatoria.";
        }

        if (Object.keys(nuevosErrores).length > 0) {
            setErrores(nuevosErrores);
            return;
        }

        if (!form.numeroConteo || ![1, 2].includes(form.numeroConteo)) {
            toast.warning("Debes seleccionar un número de conteo válido (1 o 2).");
            return;
        }

        if (!form.gruposIds || form.gruposIds.length === 0) {
            toast.warning("Debes asociar al menos un grupo responsable a la operación.");
            return;
        }

        try {
            setLoading(true);
            await crearOperacion(form);
            toast.success("Operación creada correctamente.");

            setForm((prev) => ({
                ...prev,
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
        <OperacionForm
            form={form}
            onChangeForm={handleChangeForm}
            gruposDisponibles={gruposDisponibles}
            onToggleGrupo={toggleGrupo}
            onNumeroConteoChange={handleNumeroConteoChange}
            onCrear={handleCrear}
            loading={loading}
            errores={errores}
        />
    );
};

export default OperacionCrear;
