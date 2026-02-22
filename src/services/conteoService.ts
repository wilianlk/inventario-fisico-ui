import api from "./api";

export type EstadoConteo = "EN_CONTEO" | "CERRADO" | "ABIERTO";

export interface ItemConteo {
    id: number;
    itemId?: number;
    operacionId: number;
    grupoId: number;
    conteoId?: number | null;
    codigoItem: string;
    prod: string | null;
    descripcion: string;
    udm: string;
    etiqueta: string | null;
    lote: string | null;
    costo: number;
    cantidadContada: number | null;
    ubicacion: string;
    bodega: string;
    cmpy: string;
    noEncontrado: boolean;
}

export interface DetalleConteo {
    operacionId: number;
    grupoId: number;
    grupo: string;
    numeroConteo: number;
    conteoId: number;
    estadoConteo: EstadoConteo;
    items: ItemConteo[];
}

export interface ConteoPorGrupoResponse {
    operacionId: number;
    grupoId: number;
    grupo: string;
    conteoId: number;
    numeroConteo: number;
    estadoConteo: EstadoConteo;
    items: ItemConteo[];
}

export interface ConteoActualKpis {
    conteosActivos: number;
    itemsContados: number;
    noEncontrados: number;
}

export interface FinalizarConteoPayload {
    operacionId: number;
    numeroConteo: number;
    conteoId: number;
}

export const obtenerConteoActual = () => {
    return api.get<DetalleConteo[]>("/Inventario/conteo/actual");
};

export const obtenerConteoActualKpis = () => {
    return api.get<ConteoActualKpis>("/Inventario/conteo/actual/kpis");
};

export const obtenerConteoPorGrupo = (operacionId: number, grupoId: number) => {
    return api.get<ConteoPorGrupoResponse>(
        `/Inventario/conteo/por-grupo/${operacionId}/${grupoId}`
    );
};

export const obtenerConteoPorId = (conteoId: number) => {
    return api.get<ConteoPorGrupoResponse>(
        `/inventario/conteo/${conteoId}`
    );
};

export const actualizarCantidadContada = (itemId: number, cantidadContada: number | null) => {
    const payload = cantidadContada === null ? 0 : cantidadContada;
    return api.put(
        `/OperacionConteoItems/${itemId}/cantidad-contada`,
        payload
    );
};

export const actualizarNoEncontrado = (
    conteoId: number,
    codigoItem: string,
    noEncontrado: boolean
) => {
    return api.put(
        `/OperacionConteoItems/no-encontrado`,
        { conteoId, codigoItem, noEncontrado }
    );
};

export const obtenerNoEncontradosPorConteo = (conteoId: number) => {
    return api.get<ItemConteo[]>(
        `/OperacionConteoItems/conteo/${conteoId}/no-encontrados`
    );
};

export const finalizarConteo = async (
    payload: FinalizarConteoPayload | number
) => {
    const conteoId = typeof payload === "number" ? payload : payload.conteoId;
    try {
        return await api.put(`/inventario/cerrar/conteo/${conteoId}`);
    } catch (error: any) {
        const status = error?.response?.status;
        if (status === 404 || status === 405 || status === 501) {
            return await api.put(`/inventario/conteo/${conteoId}/finalizar`);
        }
        throw error;
    }
};

export const eliminarConteo = (conteoId: number) => {
    return api.delete(`/inventario/conteo/eliminar/${conteoId}`);
};
