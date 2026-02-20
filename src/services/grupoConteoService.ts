import api from "./api";

export interface GrupoConteo {
    id: number;
    nombre: string;
    estado: string;
    fechaCreacion: string;
    usuarioCreacion: number;
    tieneConteoAbierto?: boolean;
    operacionIdConteoAbierto?: number | null;
}

function normalizarLista(data: any): GrupoConteo[] {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.result)) return data.result;
    return [];
}

export async function getGruposTodos(): Promise<GrupoConteo[]> {
    const resp = await api.get("/GrupoConteo/todos");
    return normalizarLista(resp.data);
}

export async function getGruposDisponibles(): Promise<GrupoConteo[]> {
    const resp = await api.get("/GrupoConteo/disponibles");
    return normalizarLista(resp.data);
}

export async function getGruposPorOperacion(
    operacionId: number
): Promise<GrupoConteo[]> {
    const resp = await api.get(`/GrupoConteo/por-operacion/${operacionId}`);
    return normalizarLista(resp.data);
}

export async function crearGrupo(
    nombre: string,
    usuarioId = 1
): Promise<number> {
    const resp = await api.post("/GrupoConteo/crear", null, {
        params: { nombre, usuarioId },
    });
    return resp.data?.id ?? resp.data;
}

export async function activarGrupo(grupoId: number) {
    return api.post(`/GrupoConteo/${grupoId}/activar`);
}

export async function inactivarGrupo(grupoId: number) {
    return api.post(`/GrupoConteo/${grupoId}/inactivar`);
}

export async function asignarOperacionAGrupo(
    operacionId: number,
    grupoId: number
) {
    return api.post("/AsignacionGrupo/asignar", { operacionId, grupoId });
}

export async function desasociarOperacionGrupo(
    operacionId: number,
    grupoId: number
) {
    return api.post("/AsignacionGrupo/desasociar", { operacionId, grupoId });
}
