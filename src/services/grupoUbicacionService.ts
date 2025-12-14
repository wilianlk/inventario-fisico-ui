import api from "./api";

export interface GrupoUbicacion {
    id: number;
    grupoId: number;
    ubicacion: string;
}

export interface ItemConUbicacion {
    ubicacion: string;
    item: string;
    descripcion: string;
}

export async function getUbicacionesPorGrupo(
    grupoId: number
): Promise<any[]> {
    const res = await api.get<any[]>(`/GrupoUbicacion/${grupoId}`);
    return res.data;
}

export async function agregarUbicacion(
    grupoId: number,
    ubicacion: string
): Promise<void> {
    await api.post("/GrupoUbicacion/agregar", null, {
        params: { grupoId, ubicacion },
    });
}

export async function eliminarUbicacion(
    grupoId: number,
    ubicacion: string
): Promise<void> {
    await api.delete("/GrupoUbicacion/eliminar", {
        params: { grupoId, ubicacion },
    });
}

export async function buscarUbicaciones(desde: string, hasta: string) {
    return await api.get("/GrupoUbicacion/rango", {
        params: { desde: desde.trim(), hasta: hasta.trim() },
    });
}

export async function obtenerItemsPorUbicacion(
    ubicacion: string
): Promise<ItemConUbicacion[]> {
    const res = await api.get<ItemConUbicacion[]>("/GrupoUbicacion/items", {
        params: { ubicacion },
    });
    return res.data;
}
