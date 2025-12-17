import { useState } from "react";
import { toast } from "react-toastify";

type Props = {
    operacionId: number | null;
    disabledReason?: string;
    onFinalizado?: () => void;
};

const FinalizarInventarioModal = ({ operacionId, disabledReason, onFinalizado }: Props) => {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const descargarBlob = (blob: Blob, filename: string) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
    };

    const finalizar = async () => {
        if (!operacionId) {
            toast.error(disabledReason || "No hay operación válida para finalizar.");
            return;
        }

        try {
            setLoading(true);

            const cerrarResp = await fetch(`/api/inventario/cerrar/${operacionId}`, { method: "PUT" });

            if (!cerrarResp.ok) {
                let msg = "Error al cerrar la operación.";
                try {
                    const err = await cerrarResp.json();
                    msg = err?.mensaje || msg;
                } catch {}

                const yaCerrada = msg.toLowerCase().includes("ya") && msg.toLowerCase().includes("cerrad");
                if (!yaCerrada) throw new Error(msg);
            }

            const di81Resp = await fetch(`/api/consolidacion/generar-di81/${operacionId}`, { method: "POST" });

            if (!di81Resp.ok) {
                let msg = "Error al generar DI81.";
                try {
                    const err = await di81Resp.json();
                    msg = err?.mensaje || msg;
                } catch {}
                throw new Error(msg);
            }

            const blob = await di81Resp.blob();

            const cd = di81Resp.headers.get("content-disposition") || "";
            const match = cd.match(/filename="?([^"]+)"?/i);
            const filename = match?.[1] || `DI81_${operacionId}.txt`;

            descargarBlob(blob, filename);

            toast.success("Inventario finalizado. Archivo DI81 generado.");
            setOpen(false);
            onFinalizado?.();
        } catch (e: any) {
            toast.error(e?.message || "Error inesperado.");
        } finally {
            setLoading(false);
        }
    };

    const disabled = !operacionId || !!disabledReason;

    return (
        <>
            <button
                type="button"
                className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-semibold disabled:opacity-60"
                disabled={disabled}
                onClick={() => (disabled ? toast.error(disabledReason || "Acción no disponible.") : setOpen(true))}
            >
                Finalizar
            </button>

            {open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div className="absolute inset-0 bg-black/40" onClick={() => (!loading ? setOpen(false) : null)} />
                    <div className="relative w-full max-w-md rounded-xl bg-white shadow-lg p-5">
                        <h3 className="text-base font-semibold text-slate-900">Confirmar finalización</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            ¿Está seguro de finalizar el inventario? Esta acción no se puede deshacer.
                        </p>

                        <div className="mt-5 flex justify-end gap-2">
                            <button
                                type="button"
                                className="px-4 py-2 rounded-md border text-sm"
                                disabled={loading}
                                onClick={() => setOpen(false)}
                            >
                                Cancelar
                            </button>

                            <button
                                type="button"
                                className="px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-semibold disabled:opacity-60"
                                disabled={loading}
                                onClick={finalizar}
                            >
                                {loading ? "Finalizando..." : "Confirmar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default FinalizarInventarioModal;
