import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
    operacionId: string;
    conteoId: string;
    setOperacionId: (v: string) => void;
    setConteoId: (v: string) => void;
    loading: boolean;
    onCargar: () => void;
}

const ConteoFilters = ({
                           operacionId,
                           conteoId,
                           setOperacionId,
                           setConteoId,
                           loading,
                           onCargar,
                       }: Props) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-xl border bg-white p-4 shadow-sm">
            <div>
                <Label htmlFor="operacionId">ID operación</Label>
                <Input
                    id="operacionId"
                    type="number"
                    value={operacionId}
                    onChange={(e) => setOperacionId(e.target.value)}
                    placeholder="Ej: 10"
                />
            </div>

            <div>
                <Label htmlFor="conteoId">ID conteo</Label>
                <Input
                    id="conteoId"
                    type="number"
                    value={conteoId}
                    onChange={(e) => setConteoId(e.target.value)}
                    placeholder="Ej: 5"
                />
            </div>

            <div className="flex items-end">
                <Button className="w-full" type="button" onClick={onCargar} disabled={loading}>
                    {loading ? "Cargando..." : "Cargar ítems"}
                </Button>
            </div>
        </div>
    );
};

export default ConteoFilters;
