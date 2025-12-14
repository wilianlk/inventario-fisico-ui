import api from "./api";

export interface GrupoPersona {
    id: number;
    grupoId: number;
    usuarioId: number;
    usuarioNombre: string;
}

export async function getPersonasPorGrupo(
    grupoId: number
): Promise<GrupoPersona[]> {
    const res = await api.get<GrupoPersona[]>(`/GrupoPersona/personas/${grupoId}`);
    return res.data;
}

export async function agregarPersona(
    grupoId: number,
    usuarioId: number,
    usuarioNombre: string
): Promise<void> {
    await api.post("/GrupoPersona/agregar", null, {
        params: { grupoId, usuarioId, usuarioNombre },
    });
}

export async function eliminarPersona(
    grupoId: number,
    usuarioId: number
): Promise<void> {
    await api.delete("/GrupoPersona/eliminar", {
        params: { grupoId, usuarioId },
    });
}
