import api from "./api";
import type { AxiosResponse } from "axios";

export interface Consolidado {
    operacionId: number;
    codigoProducto: string;
    descripcion: string;
    lote: string;
    ubicacion: string;
    cantidadConteo1: number;
    cantidadConteo2: number;
    cantidadConteo3: number;
    cantidadFinal: number | null;
    estado: string;
    usuarioAprobacion: string;
    fechaAprobacion: string;
}

export const obtenerConsolidado = (operacionId: number) =>
    api.get<Consolidado[]>(`/consolidacion/${operacionId}`);

export const aprobarReconteo = (data: Consolidado) =>
    api.post("/consolidacion/aprobar-reconteo", data);

export const generarDI81 = (operacionId: number) =>
    api.post<Blob>(`/consolidacion/generar-di81/${operacionId}`, null, {
        responseType: "blob",
    }) as Promise<AxiosResponse<Blob>>;
