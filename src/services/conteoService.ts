import api from "./api";

export type EstadoConteo = "ABIERTO" | "CERRADO";

export interface ItemConteo {
    id: number;
    operacionId: number;
    grupoId: number;
    conteoId: number;
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

export const obtenerConteoActual = () => {
    return api.get<DetalleConteo[]>("/Inventario/conteo/actual");
};

export const obtenerConteoPorGrupo = (operacionId: number, grupoId: number) => {
    return api.get<ConteoPorGrupoResponse>(
        `/Inventario/conteo/por-grupo/${operacionId}/${grupoId}`
    );
};

export const actualizarCantidadContada = (itemId: number, cantidadContada: number) => {
    return api.put(
        `/OperacionConteoItems/${itemId}/cantidad-contada`,
        cantidadContada
    );
};

export const actualizarNoEncontrado = (itemId: number, noEncontrado: boolean) => {
    return api.put(
        `/OperacionConteoItems/${itemId}/no-encontrado`,
        noEncontrado
    );
};

export const obtenerNoEncontradosPorConteo = (conteoId: number) => {
    return api.get<ItemConteo[]>(
        `/OperacionConteoItems/conteo/${conteoId}/no-encontrados`
    );
};

export const finalizarConteo = (conteoId: number) => {
    return api.put(`/Inventario/conteo/${conteoId}/finalizar`);
};
