import api from "./api";

export interface Operacion {
    id: number;
    bodega: string;
    fecha: string;
    observaciones: string;
    estado: string;
    usuarioCreacion: string;
    numeroConteo: number;
    porcentajeAvance?: number;
}

export interface CrearOperacionRequest {
    bodega: string;
    fecha: string;
    observaciones?: string;
    usuarioCreacion: string;
    numeroConteo: number;
    gruposIds: number[];
}

export interface AvanceOperacion {
    operacionId: number;
    totalItems: number;
    itemsContados: number;
    porcentaje: number;
}

export const obtenerOperaciones = () =>
    api.get<Operacion[]>("/inventario");

export const obtenerOperacionPorId = (id: number) =>
    api.get<Operacion>(`/inventario/${id}`);

export const crearOperacion = (data: CrearOperacionRequest) =>
    api.post("/inventario/crear", data);

export const cerrarOperacion = (id: number) =>
    api.put(`/inventario/cerrar/${id}`);

export const eliminarOperacion = (id: number) =>
    api.delete(`/inventario/eliminar/${id}`);

export const obtenerAvanceOperacion = (operacionId: number) =>
    api.get<AvanceOperacion>(`/inventario/avance/${operacionId}`);
