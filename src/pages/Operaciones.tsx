import { useEffect, useState } from "react";
import {
    obtenerOperaciones,
    eliminarOperacion,
    cerrarOperacion,
    Operacion,
} from "@/services/inventarioService";
import { getGruposDisponibles, GrupoConteo } from "@/services/grupoConteoService";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OperacionesTable from "@/components/inventario/OperacionesTable";
import OperacionCrear from "@/components/inventario/OperacionCrear";
import OperacionGruposModal from "@/components/inventario/OperacionGruposModal";
import { GrupoPersonas } from "@/components/grupos/GrupoPersonas";
import { GrupoUbicaciones } from "@/components/grupos/GrupoUbicaciones";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { toast } from "react-toastify";

type TabValue = "crear" | "lista";

const Operaciones = () => {
    const [tab, setTab] = useState<TabValue>("crear");

    const [operaciones, setOperaciones] = useState<Operacion[]>([]);
    const [loadingOperaciones, setLoadingOperaciones] = useState(false);
    const [gruposDisponibles, setGruposDisponibles] = useState<GrupoConteo[]>([]);

    const [operacionSeleccionada, setOperacionSeleccionada] = useState<Operacion | null>(null);
    const [modalGruposOpen, setModalGruposOpen] = useState(false);

    const [grupoSeleccionado, setGrupoSeleccionado] = useState<GrupoConteo | null>(null);
    const [personasOpen, setPersonasOpen] = useState(false);
    const [ubicacionesOpen, setUbicacionesOpen] = useState(false);

    const [operacionACerrar, setOperacionACerrar] = useState<Operacion | null>(null);
    const [operacionAEliminar, setOperacionAEliminar] = useState<Operacion | null>(null);
    const [loadingCerrar, setLoadingCerrar] = useState(false);
    const [loadingEliminar, setLoadingEliminar] = useState(false);

    const [errorCerrarMsg, setErrorCerrarMsg] = useState<string>("");

    const normalizarRespuestaOperaciones = (data: any): Operacion[] => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.result)) return data.result;
        return [];
    };

    const normalizarRespuestaGrupos = (data: any): GrupoConteo[] => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data?.data)) return data.data;
        if (Array.isArray(data?.result)) return data.result;
        return [];
    };

    const parseApiErrorMessage = (error: any, fallback: string) => {
        const d = error?.response?.data;
        if (!d) return fallback;
        if (typeof d === "string") return d;
        if (typeof d?.mensaje === "string") return d.mensaje;
        if (typeof d?.message === "string") return d.message;
        return fallback;
    };

    const cargarOperaciones = async () => {
        try {
            setLoadingOperaciones(true);
            const resp = await obtenerOperaciones();
            const lista = normalizarRespuestaOperaciones(resp.data);
            setOperaciones(lista);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar las operaciones de inventario.");
            setOperaciones([]);
        } finally {
            setLoadingOperaciones(false);
        }
    };

    const cargarGrupos = async () => {
        try {
            const listaCruda = await getGruposDisponibles();
            const lista = normalizarRespuestaGrupos(listaCruda);
            setGruposDisponibles(lista);
        } catch (error) {
            console.error(error);
            toast.error("Error al cargar los grupos de conteo.");
            setGruposDisponibles([]);
        }
    };

    useEffect(() => {
        cargarOperaciones();
        cargarGrupos();
    }, []);

    const handleCreated = async () => {
        await cargarOperaciones();
        setTab("lista");
    };

    const handleEliminarClick = (id: number) => {
        const op = operaciones.find((o) => o.id === id);
        if (!op) {
            toast.error("No se encontró la operación seleccionada.");
            return;
        }
        setOperacionAEliminar(op);
    };

    const confirmarEliminar = async () => {
        if (!operacionAEliminar) return;
        try {
            setLoadingEliminar(true);
            await eliminarOperacion(operacionAEliminar.id);
            toast.success("Operación eliminada.");
            await cargarOperaciones();
        } catch (error: any) {
            console.error(error);
            const msg = parseApiErrorMessage(error, "No se pudo eliminar la operación.");
            toast.error(msg);
        } finally {
            setLoadingEliminar(false);
            setOperacionAEliminar(null);
        }
    };

    const handleCerrarClick = (id: number) => {
        const op = operaciones.find((o) => o.id === id);
        if (!op) {
            toast.error("No se encontró la operación seleccionada.");
            return;
        }

        if (!op.bodega || !op.fecha) {
            toast.warning("La operación no está completa. Verifica bodega y fecha.");
            return;
        }

        if (!op.numeroConteo || ![1, 2].includes(op.numeroConteo)) {
            toast.warning("El número de conteo inicial no es válido (debe ser 1 o 2).");
            return;
        }

        setErrorCerrarMsg("");
        setOperacionACerrar(op);
    };

    const confirmarCerrar = async () => {
        if (!operacionACerrar) return;
        try {
            setLoadingCerrar(true);
            setErrorCerrarMsg("");
            await cerrarOperacion(operacionACerrar.id);
            toast.success("Operación cerrada correctamente.");
            await cargarOperaciones();
            setOperacionACerrar(null);
        } catch (error: any) {
            console.error(error);
            const msg = parseApiErrorMessage(error, "No se pudo cerrar la operación.");
            setErrorCerrarMsg(msg);
        } finally {
            setLoadingCerrar(false);
        }
    };

    const formatearFecha = (valor: string) => {
        if (!valor) return "";
        const d = new Date(valor);
        if (Number.isNaN(d.getTime())) return valor;
        return d.toLocaleDateString("es-CO");
    };

    const handleVerGrupos = (op: Operacion) => {
        setOperacionSeleccionada(op);
        setModalGruposOpen(true);
    };

    const handleVerPersonas = (grupo: GrupoConteo) => {
        setGrupoSeleccionado(grupo);
        setPersonasOpen(true);
    };

    const handleVerUbicaciones = (grupo: GrupoConteo) => {
        setGrupoSeleccionado(grupo);
        setUbicacionesOpen(true);
    };

    return (
        <section className="space-y-6 max-w-5xl mx-auto">
            <header className="space-y-1 text-center">
                <h1 className="text-2xl font-semibold text-slate-900">
                    Operaciones de inventario físico
                </h1>
                <p className="text-sm text-slate-600">
                    Crea, administra y cierra operaciones de inventario por bodega, número de conteo y grupos responsables.
                </p>
            </header>

            <Tabs value={tab} onValueChange={(v) => setTab(v as TabValue)} className="mt-2">
                <div className="rounded-xl shadow-xl overflow-hidden">
                    <div className="bg-slate-900 px-4 pt-3 pb-0">
                        <TabsList className="flex bg-transparent gap-0">
                            <TabsTrigger
                                value="crear"
                                className="flex-1 px-6 py-2 text-sm font-semibold
                                           data-[state=active]:bg-white
                                           data-[state=active]:text-slate-900
                                           data-[state=active]:rounded-t-lg
                                           data-[state=inactive]:text-slate-200
                                           data-[state=inactive]:hover:bg-slate-800/60
                                           border-b-2 border-transparent
                                           data-[state=active]:border-white
                                           transition-all duration-200 ease-in-out"
                            >
                                Crear operación
                            </TabsTrigger>

                            <TabsTrigger
                                value="lista"
                                className="flex-1 px-6 py-2 text-sm font-semibold
                                           data-[state=active]:bg-white
                                           data-[state=active]:text-slate-900
                                           data-[state=active]:rounded-t-lg
                                           data-[state=inactive]:text-slate-200
                                           data-[state=inactive]:hover:bg-slate-800/60
                                           border-b-2 border-transparent
                                           data-[state=active]:border-white
                                           transition-all duration-200 ease-in-out"
                            >
                                Operaciones registradas
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="bg-white p-4">
                        <TabsContent value="crear">
                            <OperacionCrear
                                gruposDisponibles={gruposDisponibles}
                                onCreated={handleCreated}
                            />
                        </TabsContent>

                        <TabsContent value="lista">
                            <OperacionesTable
                                operaciones={operaciones}
                                loading={loadingOperaciones}
                                onCerrar={handleCerrarClick}
                                onEliminar={handleEliminarClick}
                                formatearFecha={formatearFecha}
                                onVerGrupos={handleVerGrupos}
                            />
                        </TabsContent>
                    </div>
                </div>
            </Tabs>

            <OperacionGruposModal
                open={modalGruposOpen}
                operacion={operacionSeleccionada}
                onClose={() => setModalGruposOpen(false)}
                onVerPersonas={handleVerPersonas}
                onVerUbicaciones={handleVerUbicaciones}
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

            <Dialog
                open={!!operacionACerrar}
                onOpenChange={(open) => {
                    if (!open) {
                        setOperacionACerrar(null);
                        setErrorCerrarMsg("");
                    }
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Cerrar operación</DialogTitle>
                        <DialogDescription>
                            Se cerrará la operación de inventario seleccionada. Esta acción no se puede deshacer.
                        </DialogDescription>
                    </DialogHeader>

                    {operacionACerrar && (
                        <div className="text-sm text-slate-700 space-y-1 mb-4">
                            <div>
                                <span className="font-medium">ID:</span> {operacionACerrar.id}
                            </div>
                            <div>
                                <span className="font-medium">Bodega:</span> {operacionACerrar.bodega}
                            </div>
                            <div>
                                <span className="font-medium">Conteo:</span> {operacionACerrar.numeroConteo}
                            </div>
                        </div>
                    )}

                    {errorCerrarMsg ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                            {errorCerrarMsg}
                        </div>
                    ) : null}

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setOperacionACerrar(null);
                                setErrorCerrarMsg("");
                            }}
                            disabled={loadingCerrar}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmarCerrar}
                            disabled={loadingCerrar}
                        >
                            {loadingCerrar ? "Cerrando..." : "Cerrar operación"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!operacionAEliminar}
                onOpenChange={(open) => {
                    if (!open) setOperacionAEliminar(null);
                }}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Eliminar operación</DialogTitle>
                        <DialogDescription>
                            Se eliminará la operación en estado EN_PREPARACION. Esta acción es irreversible.
                        </DialogDescription>
                    </DialogHeader>

                    {operacionAEliminar && (
                        <div className="text-sm text-slate-700 space-y-1 mb-4">
                            <div>
                                <span className="font-medium">ID:</span> {operacionAEliminar.id}
                            </div>
                            <div>
                                <span className="font-medium">Bodega:</span> {operacionAEliminar.bodega}
                            </div>
                            <div>
                                <span className="font-medium">Conteo:</span> {operacionAEliminar.numeroConteo}
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOperacionAEliminar(null)}
                            disabled={loadingEliminar}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={confirmarEliminar}
                            disabled={loadingEliminar}
                        >
                            {loadingEliminar ? "Eliminando..." : "Eliminar operación"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
};

export default Operaciones;
