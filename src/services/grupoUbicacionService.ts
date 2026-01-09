import api from "./api";

export interface FiltroGrupoUbicacion {
    grupoId: number;
    bodega: string;
    rack: string;
    lado: string;
    altura: string;
    ubicacion: string;
}

export interface UbicacionMaterializada {
    ubicacion: string;
    rack: string;
    lado: string;
    altura: string;
    posicion: string;
}

export interface AgregarUbicacionesRequest {
    grupoId: number;
    bodega: string;
    ubicaciones: UbicacionMaterializada[];
}

export interface ItemPhystag {
    cmpy: string;
    bodega: string;
    etiqueta: string;
    item: string;
    prod: string;
    ubicacion: string;
    rackPasillo: string;
    lado: string;
    altura: string;
    posicion: string;
    lote: string;
    descripcion: string;
    udm: string;
    costo: number;
    cantidadSistema: number;
    grupoId: number;
    grupoNombre: string;
}

export async function obtenerItemsPorGrupo(
    grupoId?: number
): Promise<{ total: number; data: ItemPhystag[] }> {
    const res = await api.get("/GrupoUbicacion", {
        params: grupoId ? { grupoId } : {},
    });
    return res.data;
}

export async function previsualizarItems(params: {
    bodega: string;
    rack?: string;
    lado?: string;
    altura?: string;
    ubicacion?: string;
}): Promise<{ total: number; data: ItemPhystag[] }> {
    const res = await api.get("/GrupoUbicacion/previsualizar", { params });
    return res.data;
}

export async function obtenerBodegas(): Promise<{
    total: number;
    data: { id: string; descripcion: string }[];
}> {
    const res = await api.get("/GrupoUbicacion/bodegas");
    return res.data;
}

export async function agregarUbicacionesAlGrupo(
    req: AgregarUbicacionesRequest
): Promise<void> {
    await api.post("/GrupoUbicacion/agregar", {
        grupoId: req.grupoId,
        bodega: req.bodega,
        ubicaciones: (req.ubicaciones || []).map((x) => ({
            ubicacion: x.ubicacion ?? "",
            rack: x.rack ?? "",
            lado: x.lado ?? "",
            altura: x.altura ?? "",
            posicion: x.posicion ?? "",
        })),
    });
}

export async function eliminarFiltro(
    filtro: FiltroGrupoUbicacion
): Promise<void> {
    await api.delete("/GrupoUbicacion/eliminar", {
        params: {
            grupoId: filtro.grupoId,
            bodega: filtro.bodega,
            rack: filtro.rack ?? "",
            lado: filtro.lado ?? "",
            altura: filtro.altura ?? "",
            ubicacion: filtro.ubicacion ?? "",
        },
    });
}
