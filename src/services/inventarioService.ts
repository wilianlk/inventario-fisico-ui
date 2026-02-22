import api from "./api";

export interface Operacion {
    id: number;
    bodega: string;
    fecha: string;
    observaciones: string;
    estado: string;
    usuarioCreacion: string;
    numeroConteo: number;
    fechaCreacion?: string;
    gruposIds?: number[] | null;
    porcentajes?: Porcentajes;
    conteos?: OperacionConteo[];
    totalItems?: number;
    itemsContados?: number;
    porcentaje?: number;
}

export interface Porcentajes {
    totalItems: number;
    itemsContados: number;
    porcentaje: number;
}

export interface OperacionConteoGrupo {
    id?: number;
    conteoId?: number;
    grupoId: number;
    grupo: string;
    numeroConteo: number;
    estado?: string;
    fechaCreacion?: string;
    porcentajes?: Porcentajes;
}

export interface OperacionConteo {
    numeroConteo: number;
    grupos: OperacionConteoGrupo[];
}

export type OperacionWrapper = {
    operacion: Operacion;
};

export interface CrearOperacionRequest {
    bodega: string;
    fecha: string;
    observaciones?: string;
    usuarioCreacion: string;
    numeroConteo: number;
    gruposIds: number[];
}

export interface CerrarOperacionResponse {
    mensaje?: string;
    conteosCerrados?: number;
}


export const obtenerOperaciones = () =>
    api.get<Operacion[]>("/inventario");

export const obtenerOperacionPorId = (id: number) =>
    api.get<Operacion>(`/inventario/${id}`);

export const crearOperacion = (data: CrearOperacionRequest) =>
    api.post("/inventario/crear", data);

export const cerrarOperacion = (id: number) =>
    api.put<CerrarOperacionResponse>(`/inventario/cerrar/${id}`);

export const eliminarOperacion = (id: number) =>
    api.delete(`/inventario/eliminar/${id}`);

const unwrapList = (data: any): any[] => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.result)) return data.result;
    return [];
};

const normalizarConteoGrupo = (g: any, numeroConteoFallback: number): OperacionConteoGrupo => {
    const numeroConteo = Number(g?.numeroConteo ?? numeroConteoFallback) || numeroConteoFallback;
    return {
        id: g?.id ?? g?.conteoId,
        conteoId: g?.conteoId ?? g?.id,
        grupoId: g?.grupoId,
        grupo: g?.grupo ?? g?.grupoNombre ?? g?.nombre ?? "",
        numeroConteo,
        estado: g?.estado,
        fechaCreacion: g?.fechaCreacion,
        porcentajes: g?.porcentajes,
    };
};

const normalizarOperacion = (raw: any): Operacion | null => {
    if (!raw) return null;
    const op = raw?.operacion ?? raw;
    if (!op || typeof op !== "object") return null;

    const porcentajes: Porcentajes | undefined =
        op?.porcentajes && typeof op.porcentajes === "object" ? op.porcentajes : undefined;

    const totalItems = op?.totalItems ?? porcentajes?.totalItems;
    const itemsContados = op?.itemsContados ?? porcentajes?.itemsContados;
    const porcentaje = op?.porcentaje ?? porcentajes?.porcentaje;

    const conteos: OperacionConteo[] | undefined = Array.isArray(op?.conteos)
        ? op.conteos.map((c: any) => {
              const numeroConteo = Number(c?.numeroConteo) || 0;
              const grupos = Array.isArray(c?.grupos)
                  ? c.grupos.map((g: any) => normalizarConteoGrupo(g, numeroConteo))
                  : [];
              return { numeroConteo, grupos };
          })
        : undefined;

    return {
        ...op,
        porcentajes,
        conteos,
        totalItems,
        itemsContados,
        porcentaje,
    } as Operacion;
};

export const normalizarOperaciones = (data: any): Operacion[] => {
    const lista = unwrapList(data);
    return lista
        .map((item) => normalizarOperacion(item))
        .filter((op): op is Operacion => !!op);
};

export interface AgregarConteoRequest {
    numeroConteo: number;
    gruposIds?: number[];
}

export const agregarConteoOperacion = async (
    operacionId: number,
    payload: AgregarConteoRequest
) => {
    try {
        return await api.post(`/inventario/conteo/agregar/${operacionId}`, payload);
    } catch (error: any) {
        const status = error?.response?.status;
        if (status === 404 || status === 405 || status === 501) {
            return await api.put(`/inventario/conteo/editar/${operacionId}`, payload);
        }
        throw error;
    }
};

