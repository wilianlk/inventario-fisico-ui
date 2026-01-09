import type { DetalleConteo } from "@/services/conteoService";

export type ScanProcessResult = {
    handled: boolean;
    applied: boolean; // true SOLO si aplicó conteo (sum/replace)
    info?: string;
    warn?: string;
    error?: string;
};

export type ScanAppliedOpts = { mode: "sum" | "replace" };

export interface UseConteoScanParams {
    detalles: DetalleConteo[];
    onSumarCantidad: (itemId: number, delta: number) => Promise<void>;
    onSelectItem: (itemId: number | null) => void;
    onResetBusquedaManual: () => void;
    onScanApplied?: (itemId: number, value: number, opts?: ScanAppliedOpts) => void;
}

export type ParsedScan = {
    raw: string;
    codigoItem: string;
    lote?: string;
    loteAlt?: string;
    orden?: string;
    unidad?: string;
    cantidad?: string;
};
