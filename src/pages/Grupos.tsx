import { useEffect, useRef, useState } from "react";
import {
    GrupoConteo,
    getGruposTodos,
    activarGrupo,
    inactivarGrupo,
} from "@/services/grupoConteoService";
import GrupoTable from "@/components/grupos/GrupoTable";
import { GrupoCrear } from "@/components/grupos/GrupoCrear";
import { GrupoPersonas } from "@/components/grupos/GrupoPersonas";
import { GrupoUbicaciones } from "@/components/grupos/GrupoUbicaciones";

import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "react-toastify";

function Grupos() {
    const [grupos, setGrupos] = useState<GrupoConteo[]>([]);
    const [loading, setLoading] = useState(false);
    const [grupoFiltro, setGrupoFiltro] = useState("");
    const [crearOpen, setCrearOpen] = useState(false);
    const [personasOpen, setPersonasOpen] = useState(false);
    const [ubicacionesOpen, setUbicacionesOpen] = useState(false);
    const [grupoSeleccionado, setGrupoSeleccionado] =
        useState<GrupoConteo | null>(null);
    const didInitRef = useRef(false);

    const cargarGrupos = async () => {
        setLoading(true);
        try {
            const data = await getGruposTodos();
            const filtro = grupoFiltro.trim();
            let filtrados = data;
            if (filtro) {
                const num = Number(filtro);
                if (Number.isFinite(num) && String(num) === filtro) {
                    filtrados = data.filter((g) => g.id === num);
                } else {
                    const lower = filtro.toLowerCase();
                    filtrados = data.filter((g) =>
                        (g.nombre || "").toLowerCase().includes(lower)
                    );
                }
            }
            setGrupos(filtrados);
            if (filtro && filtrados.length === 0) {
                toast.info("No hay grupos con ese filtro.");
            }
        } catch {
            toast.error("Error al cargar los grupos.");
            setGrupos([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (didInitRef.current) return;
        didInitRef.current = true;
        cargarGrupos();
    }, []);

    const handleToggleEstado = async (grupo: GrupoConteo) => {
        try {
            if (grupo.estado === "ACTIVO") {
                await inactivarGrupo(grupo.id);
                toast.success("Grupo inactivado.");
            } else {
                await activarGrupo(grupo.id);
                toast.success("Grupo activado.");
            }
            await cargarGrupos();
        } catch {
            toast.error("No se pudo cambiar el estado del grupo.");
        }
    };

    const handleAplicarFiltro = async (e: React.FormEvent) => {
        e.preventDefault();
        await cargarGrupos();
    };

    const handleCreated = async () => {
        await cargarGrupos();
    };

    return (
        <section className="space-y-6 max-w-5xl mx-auto">
            <header className="space-y-1 text-center">
                <h1 className="text-2xl font-semibold text-slate-900">
                    Grupos de conteo
                </h1>
                <p className="text-sm text-slate-600">
                    Administración de grupos, asignación a operaciones, personas y ubicaciones.
                </p>
            </header>

            <Card className="shadow-xl border-slate-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 bg-slate-900 text-slate-50 rounded-t-xl px-4 py-3">
                    <div>
                        <CardTitle className="text-sm font-semibold tracking-wide">
                            Gestión de grupos
                        </CardTitle>
                        <CardDescription className="text-xs text-slate-300">
                            Usa filtros, crea nuevos grupos y gestiona sus relaciones.
                        </CardDescription>
                    </div>
                    <Button
                        size="sm"
                        className="rounded-full bg-blue-500 hover:bg-blue-400 text-xs font-semibold"
                        onClick={() => setCrearOpen(true)}
                    >
                        Crear grupo
                    </Button>
                </CardHeader>

                <CardContent className="space-y-4 bg-white">
                    <form
                        onSubmit={handleAplicarFiltro}
                        className="mt-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
                    >
                        <div className="flex flex-col gap-1">
                            <Label htmlFor="grupoFiltro" className="text-xs text-slate-600">
                                Filtrar por grupo
                            </Label>
                            <Input
                                id="grupoFiltro"
                                className="w-40 text-sm"
                                value={grupoFiltro}
                                onChange={(e) => setGrupoFiltro(e.target.value)}
                                placeholder="Ej: William o 3"
                            />
                        </div>
                        <Button
                            type="submit"
                            size="sm"
                            className="bg-slate-900 hover:bg-slate-800 text-xs font-semibold"
                        >
                            Aplicar
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs text-slate-600 hover:bg-slate-100"
                            onClick={() => {
                                setGrupoFiltro("");
                                cargarGrupos();
                            }}
                        >
                            Limpiar
                        </Button>
                    </form>

                    <GrupoTable
                        grupos={grupos}
                        loading={loading}
                        onVerPersonas={(g) => {
                            setGrupoSeleccionado(g);
                            setPersonasOpen(true);
                        }}
                        onVerUbicaciones={(g) => {
                            setGrupoSeleccionado(g);
                            setUbicacionesOpen(true);
                        }}
                        onToggleEstado={handleToggleEstado}
                    />
                </CardContent>
            </Card>

            <GrupoCrear
                open={crearOpen}
                onClose={() => setCrearOpen(false)}
                onCreated={handleCreated}
            />

            <GrupoPersonas
                open={personasOpen}
                grupo={grupoSeleccionado}
                onClose={() => setPersonasOpen(false)}
            />

            <GrupoUbicaciones
                open={ubicacionesOpen}
                grupo={grupoSeleccionado}
                onClose={() => setUbicacionesOpen(false)}
            />
        </section>
    );
}

export default Grupos;


