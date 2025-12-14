import api from "./api";

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
}

export interface DetalleConteo {
    operacionId: number;
    grupoId: number;
    grupo: string;
    numeroConteo: number;
    items: ItemConteo[];
}

export const obtenerConteoActual = () => {
    return api.get<DetalleConteo[]>("/Inventario/conteo/actual");
};

export const actualizarCantidadContada = (itemId: number, cantidadContada: number) => {
    return api.put(`/OperacionConteoItems/${itemId}/cantidad-contada`, cantidadContada);
};
