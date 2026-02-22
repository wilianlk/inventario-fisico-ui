import { ChangeEvent, useEffect, useRef, useState } from "react";
import {
    obtenerOperaciones,
    eliminarOperacion,
    cerrarOperacion,
    agregarConteoOperacion,
    AgregarConteoRequest,
    CrearOperacionRequest,
    CerrarOperacionResponse,
    Operacion,
    normalizarOperaciones,
} from "@/services/inventarioService";
import { getGruposDisponibles, getGruposPorOperacion, GrupoConteo } from "@/services/grupoConteoService";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OperacionesTable from "@/components/inventario/OperacionesTable";
import OperacionCrear from "@/components/inventario/OperacionCrear";
import OperacionForm from "@/components/inventario/OperacionForm";
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
    const [operacionAEditar, setOperacionAEditar] = useState<Operacion | null>(null);
    const [loadingCerrar, setLoadingCerrar] = useState(false);
    const [loadingEliminar, setLoadingEliminar] = useState(false);
    const [loadingEditar, setLoadingEditar] = useState(false);

    const [errorCerrarMsg, setErrorCerrarMsg] = useState<string>("");
    const [errorEditarMsg, setErrorEditarMsg] = useState<string>("");
    const [nuevoConteo, setNuevoConteo] = useState<number>(2);
    const [formEditar, setFormEditar] = useState<CrearOperacionRequest | null>(null);
    const [gruposEditar, setGruposEditar] = useState<GrupoConteo[]>([]);
    const [loadingGruposEditar, setLoadingGruposEditar] = useState(false);
    const [gruposEditarLoaded, setGruposEditarLoaded] = useState(false);
    const didInitRef = useRef(false);

    const normalizarRespuestaGrupos = (data: any): GrupoConteo[] => {
        if (Array.isArray(data)) return data;
        if (Array.isArray(data.data)) return data.data;
        if (Array.isArray(data.result)) return data.result;
        return [];
    };

    const mergeGrupos = (base: GrupoConteo[], extra: GrupoConteo[]) => {
        const mapa = new Map<number, GrupoConteo>();
        (Array.isArray(base) ? base : []).forEach((g) => mapa.set(g.id, g));
        (Array.isArray(extra) ? extra : []).forEach((g) => {
            if (!mapa.has(g.id)) mapa.set(g.id, g);
        });
        return Array.from(mapa.values());
    };

    const parseApiErrorMessage = (error: any, fallback: string) => {
        const d = error?.response?.data;
        if (!d) return fallback;
        if (typeof d === "string") return d;
        if (typeof d.mensaje === "string") return d.mensaje;
        if (typeof d.message === "string") return d.message;
        return fallback;
    };

    const cargarOperaciones = async () => {
        try {
            setLoadingOperaciones(true);
            const resp = await obtenerOperaciones();
            const lista = normalizarOperaciones(resp.data);
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
        if (didInitRef.current) return;
        didInitRef.current = true;
        cargarOperaciones();
        cargarGrupos();
    }, []);

    const handleCreated = async () => {
        await cargarOperaciones();
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

        setErrorCerrarMsg("");
        setOperacionACerrar(op);
    };

    const handleAgregarConteoClick = (op: Operacion) => {
        if (op.estado === "CERRADA") {
            toast.warning("No se puede editar una operación cerrada.");
            return;
        }
        const conteoActual = Number(op.numeroConteo) || 1;
        setErrorEditarMsg("");
        setOperacionAEditar(op);
        setNuevoConteo([1, 2, 3].includes(conteoActual) ? conteoActual : 1);
    };

    const confirmarCerrar = async () => {
        if (!operacionACerrar) return;
        try {
            setLoadingCerrar(true);
            setErrorCerrarMsg("");
            const resp = await cerrarOperacion(operacionACerrar.id);
            const data = (resp?.data || {}) as CerrarOperacionResponse;
            const mensaje = data?.mensaje || "Operación cerrada correctamente.";
            const conteosCerrados = Number(data?.conteosCerrados);
            if (Number.isFinite(conteosCerrados)) {
                const plural = conteosCerrados === 1 ? "" : "s";
                toast.success(`${mensaje} (${conteosCerrados} conteo${plural} cerrado${plural}).`);
            } else {
                toast.success(mensaje);
            }
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

    const confirmarAgregarConteo = async () => {
        if (!operacionAEditar || !formEditar) return;
        try {
            setLoadingEditar(true);
            setErrorEditarMsg("");
            const payload: AgregarConteoRequest = {
                numeroConteo: nuevoConteo,
            };
            if (formEditar.gruposIds && formEditar.gruposIds.length > 0) {
                payload.gruposIds = formEditar.gruposIds;
            }
            await agregarConteoOperacion(operacionAEditar.id, payload);
            toast.success("Conteo agregado correctamente.");
            await cargarOperaciones();
            setOperacionAEditar(null);
        } catch (error: any) {
            console.error(error);
            const msg = parseApiErrorMessage(error, "No se pudo agregar el conteo.");
            setErrorEditarMsg(msg);
        } finally {
            setLoadingEditar(false);
        }
    };

    useEffect(() => {
        if (!operacionAEditar) {
            setFormEditar(null);
            setGruposEditar([]);
            setGruposEditarLoaded(false);
            return;
        }

        const fecha = operacionAEditar.fecha ? String(operacionAEditar.fecha).slice(0, 10) : "";

        setFormEditar({
            bodega: operacionAEditar.bodega ?? "11",
            fecha,
            observaciones: operacionAEditar.observaciones ?? "",
            usuarioCreacion: operacionAEditar.usuarioCreacion ?? "",
            numeroConteo: operacionAEditar.numeroConteo ?? 1,
            gruposIds: [],
        });

        setLoadingGruposEditar(true);
        setGruposEditarLoaded(false);
        getGruposPorOperacion(operacionAEditar.id)
            .then((lista) => {
                const grupos = Array.isArray(lista) ? lista : [];
                setGruposEditar(grupos);
                setGruposEditarLoaded(true);
                setFormEditar((prev: CrearOperacionRequest | null) =>
                    prev ? { ...prev, gruposIds: grupos.map((g) => g.id) } : prev
                );
            })
            .catch(() => {
                setGruposEditar([]);
                setGruposEditarLoaded(false);
            })
            .finally(() => {
                setLoadingGruposEditar(false);
            });
    }, [operacionAEditar]);

    const toggleGrupoEditar = (grupoId: number, checked: boolean) => {
        setFormEditar((prev) => {
            if (!prev) return prev;
            const actual = prev.gruposIds || [];
            const next = checked
                ? actual.includes(grupoId)
                    ? actual
                    : [...actual, grupoId]
                : actual.filter((id) => id !== grupoId);
            return { ...prev, gruposIds: next };
        });
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
                                onAgregarConteo={handleAgregarConteoClick}
                                onConteoEliminado={handleCreated}
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
                open={!!operacionAEditar}
                onOpenChange={(open) => {
                    if (!open) {
                        setOperacionAEditar(null);
                        setErrorEditarMsg("");
                    }
                }}
            >
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Agregar conteo</DialogTitle>
                        <DialogDescription>
                            Solo se permite aumentar el número de conteo.
                        </DialogDescription>
                    </DialogHeader>

                    {operacionAEditar && formEditar ? (
                        <div className="space-y-3">
                            <OperacionForm
                                form={{ ...formEditar, numeroConteo: nuevoConteo }}
                                onChangeForm={() => undefined}
                                gruposDisponibles={mergeGrupos(gruposDisponibles, gruposEditar)}
                                onToggleGrupo={toggleGrupoEditar}
                                onNumeroConteoChange={(e: ChangeEvent<HTMLSelectElement>) =>
                                    setNuevoConteo(Number(e.target.value))
                                }
                                conteoForzado={undefined}
                                onCrear={() => undefined}
                                loading={loadingGruposEditar}
                                canCreate
                                errores={{}}
                                disabledFields={{
                                    fecha: true,
                                    observaciones: true,
                                    grupos: false,
                                    numeroConteo: false,
                                }}
                                hideSubmit
                            />
                        </div>
                    ) : null}

                    {errorEditarMsg ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                            {errorEditarMsg}
                        </div>
                    ) : null}

                    <DialogFooter className="gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setOperacionAEditar(null);
                                setErrorEditarMsg("");
                            }}
                            disabled={loadingEditar}
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmarAgregarConteo}
                            disabled={loadingEditar}
                        >
                            {loadingEditar ? "Guardando..." : "Agregar conteo"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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
                        <div className="space-y-3 mb-4">
                            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
                                Este cierre aplica a toda la operación, sin importar desde qué bloque de conteo se presione.
                            </div>
                        </div>
                    )}

                    {errorCerrarMsg ? (
                        <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                            {errorCerrarMsg}
                        </div>
                    ) : null}

                    <DialogFooter className="gap-2 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                                setOperacionACerrar(null);
                                setErrorCerrarMsg("");
                            }}
                            disabled={loadingCerrar}
                            className="min-w-28"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            onClick={confirmarCerrar}
                            disabled={loadingCerrar}
                            className="min-w-32"
                        >
                            {loadingCerrar ? "Cerrando operación..." : "Confirmar cierre"}
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
                        <div className="space-y-3 mb-4">
                            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                                Esta acción elimina la operación y no se puede deshacer.
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 pt-1">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setOperacionAEliminar(null)}
                            disabled={loadingEliminar}
                            className="min-w-28"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            onClick={confirmarEliminar}
                            disabled={loadingEliminar}
                            className="min-w-32"
                        >
                            {loadingEliminar ? "Eliminando operación..." : "Confirmar eliminación"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </section>
    );
};

export default Operaciones;







