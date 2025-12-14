import { GrupoConteo } from "@/services/grupoConteoService";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface GrupoTableProps {
    grupos: GrupoConteo[];
    loading: boolean;
    onVerPersonas: (grupo: GrupoConteo) => void;
    onVerUbicaciones: (grupo: GrupoConteo) => void;
    onToggleEstado: (grupo: GrupoConteo) => void;
}

const GrupoTable = ({
                        grupos,
                        loading,
                        onVerPersonas,
                        onVerUbicaciones,
                        onToggleEstado,
                    }: GrupoTableProps) => {
    return (
        <Card>
            <CardHeader className="text-center">
                <CardTitle>Grupos de conteo</CardTitle>
            </CardHeader>

            <CardContent>
                {loading ? (
                    <p className="text-sm text-slate-500 text-center">
                        Cargando grupos…
                    </p>
                ) : grupos.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center">
                        No hay grupos registrados.
                    </p>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-center">ID</TableHead>
                                <TableHead className="text-center">Nombre</TableHead>
                                <TableHead className="text-center">Estado</TableHead>
                                <TableHead className="text-center">
                                    Fecha creación
                                </TableHead>
                                <TableHead className="text-center">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {grupos.map((g) => (
                                <TableRow key={g.id}>
                                    <TableCell className="text-center">{g.id}</TableCell>
                                    <TableCell className="text-center">
                                        {g.nombre}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span
                                            className={
                                                g.estado === "ACTIVO"
                                                    ? "inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                                                    : "inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                                            }
                                        >
                                            {g.estado}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {g.fechaCreacion ?? "-"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap justify-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => onVerPersonas(g)}
                                            >
                                                Personas
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => onVerUbicaciones(g)}
                                            >
                                                Ubicaciones
                                            </Button>
                                            <Button
                                                variant={
                                                    g.estado === "ACTIVO"
                                                        ? "destructive"
                                                        : "secondary"
                                                }
                                                size="sm"
                                                className="h-7 px-2 text-xs"
                                                onClick={() => onToggleEstado(g)}
                                            >
                                                {g.estado === "ACTIVO"
                                                    ? "Inactivar"
                                                    : "Activar"}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    );
};

export default GrupoTable;
