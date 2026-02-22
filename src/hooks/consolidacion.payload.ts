import type { BackendConsolidadoItem } from "@/hooks/consolidacion.logic";

export type BackendOperacionCabecera = {
    operacionId?: unknown;
    estado?: unknown;
    finalizada?: unknown;
};

export type BackendOperacion = {
    cabecera?: BackendOperacionCabecera;
    items?: BackendConsolidadoItem[];
};

export type BackendConteosFinalizadosPayload =
    | {
          operaciones?: BackendOperacion[];
          items?: BackendConsolidadoItem[];
      }
    | BackendConsolidadoItem[]
    | undefined;

const toPositiveInt = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const out = Number(value);
    if (!Number.isFinite(out)) return null;
    const normalized = Math.trunc(out);
    return normalized > 0 ? normalized : null;
};

export const parseConteosFinalizadosPayload = (data: BackendConteosFinalizadosPayload) => {
    const operacionesPayload = Array.isArray(data) ? [] : (data?.operaciones ?? []);

    const itemsFromOperaciones = Array.isArray(operacionesPayload)
        ? operacionesPayload.flatMap((op) => (Array.isArray(op?.items) ? op.items : []))
        : [];

    const estadoPorOperacion: Record<number, boolean> = {};
    const estadoTextoPorOperacion: Record<number, string> = {};
    if (Array.isArray(operacionesPayload)) {
        for (const op of operacionesPayload) {
            const opId = toPositiveInt(op?.cabecera?.operacionId);
            if (opId === null) continue;

            const finalizadaCabecera = op?.cabecera?.finalizada;
            const finalizadaCabeceraBool =
                typeof finalizadaCabecera === "boolean"
                    ? finalizadaCabecera
                    : String(op?.cabecera?.estado ?? "").trim().toUpperCase() === "FINALIZADA";

            estadoPorOperacion[opId] = finalizadaCabeceraBool;

            const estadoTexto = String(op?.cabecera?.estado ?? "").trim();
            if (estadoTexto) estadoTextoPorOperacion[opId] = estadoTexto;
        }
    }

    const itemsPlano = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
    const items = itemsFromOperaciones.length > 0 ? itemsFromOperaciones : itemsPlano;

    return { items, estadoPorOperacion, estadoTextoPorOperacion };
};
