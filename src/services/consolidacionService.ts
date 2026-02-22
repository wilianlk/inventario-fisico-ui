import api from "./api";
import type { AxiosResponse } from "axios";
import type { BackendConsolidadoItem } from "@/hooks/consolidacion.logic";

export interface ConteoFinalizadoItem {
    id: number;
    operacionId: number;
    grupoId: number;
    conteoId: number;
    codigoItem: string;
    descripcion?: string;
    udm?: string;
    etiqueta?: string;
    lote?: string;
    costo?: number;
    cantidadSistema?: number;
    cantidadContada?: number;
    ubicacion: string;
}

export interface ConteoFinalizado {
    conteo: {
        id: number;
        operacionId: number;
        grupoId: number;
        numeroConteo: number;
        estado: string;
        fechaCreacion: string;
        nombreGrupo?: string;
    };
    items: ConteoFinalizadoItem[];
}

export interface ConsolidacionCierre {
    operacionIds: number[];
    operacionesFinalizadas: number[];
}

export type ConteosFinalizadosOperacionResponse = {
    cabecera?: {
        operacionId?: number;
        estado?: string;
        finalizada?: boolean;
        bodega?: string;
        fechaOperacion?: string;
        usuarioCreacion?: string;
        fechaCreacion?: string;
        numeroConteo?: number;
        observaciones?: string;
        totalRegistros?: number;
        totalNoEncontrados?: number;
        totalReferencias?: number;
        conteos?: number[];
        totalConteos?: number;
    };
    items?: BackendConsolidadoItem[];
};

export type ConteosFinalizadosResponse = {
    operaciones?: ConteosFinalizadosOperacionResponse[];
    items?: BackendConsolidadoItem[];
};

export const obtenerConteosFinalizados = () =>
    api.get<ConteosFinalizadosResponse>(
        `/consolidacion/conteos-finalizados`
    );

export const cerrarConsolidacion = (operacionId: number) =>
    api.post(
        `/consolidacion/cerrar/${operacionId}`,
        null
    );

export const generarDI81 = (operacionId: number) =>
    api.post<Blob>(
        `/consolidacion/generar-di81/${operacionId}`,
        null,
        { responseType: "blob" }
    ) as Promise<AxiosResponse<Blob>>;
