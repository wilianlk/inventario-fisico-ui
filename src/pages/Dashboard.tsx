import { useEffect, useState } from "react";
import { obtenerConteoActualKpis, ConteoActualKpis } from "@/services/conteoService";

const Dashboard = () => {
    const [loading, setLoading] = useState(true);
    const [kpiData, setKpiData] = useState<ConteoActualKpis>({
        conteosActivos: 0,
        itemsContados: 0,
        noEncontrados: 0,
    });

    useEffect(() => {
        let mounted = true;

        const cargar = async () => {
            setLoading(true);
            try {
                const resp = await obtenerConteoActualKpis();
                if (!mounted) return;
                setKpiData(resp.data ?? { conteosActivos: 0, itemsContados: 0, noEncontrados: 0 });
            } catch {
                if (!mounted) return;
                setKpiData({ conteosActivos: 0, itemsContados: 0, noEncontrados: 0 });
            } finally {
                if (mounted) setLoading(false);
            }
        };

        void cargar();
        return () => {
            mounted = false;
        };
    }, []);

    const kpis = [
        { label: "Conteos activos", value: String(kpiData.conteosActivos), delta: "" },
        { label: "Ítems contados", value: String(kpiData.itemsContados), delta: "" },
        { label: "No encontrados", value: String(kpiData.noEncontrados), delta: "" },
    ];

    const progreso = [12, 18, 26, 34, 49, 61, 68];
    const barras = [22, 40, 18, 55, 42, 31, 60];
    const donut = 0.74;

    return (
        <section className="space-y-6">
            {/* Encabezado */}
            <header className="space-y-1">
                <h1 className="text-3xl font-semibold text-slate-900">
                    Bienvenido al Inventario Físico
                </h1>
                <p className="text-sm text-slate-600">
                    Resumen rápido del avance del conteo y principales variaciones.
                </p>
            </header>

            {/* KPIs */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {kpis.map((kpi) => (
                    <div
                        key={kpi.label}
                        className="rounded-xl border bg-white p-4 shadow-sm"
                    >
                        <div className="text-xs text-slate-500">{kpi.label}</div>
                        <div className="mt-1 text-2xl font-semibold text-slate-900">
                            {loading ? "..." : kpi.value}
                        </div>
                        {kpi.delta ? (
                            <div className="mt-1 text-xs text-slate-600">{kpi.delta}</div>
                        ) : null}
                    </div>
                ))}
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border bg-white p-4 shadow-sm lg:col-span-2">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-semibold text-slate-900">
                                Progreso de conteo
                            </div>
                            <div className="text-xs text-slate-500">
                                Últimos 7 días
                            </div>
                        </div>
                        <div className="text-xs text-slate-500">%</div>
                    </div>
                    <div className="mt-4 h-40 w-full">
                        <svg viewBox="0 0 300 120" className="h-full w-full">
                            <defs>
                                <linearGradient id="lineGrad" x1="0" x2="0" y1="0" y2="1">
                                    <stop offset="0%" stopColor="#0f172a" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="#0f172a" stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <polyline
                                fill="url(#lineGrad)"
                                stroke="none"
                                points={`0,120 ${progreso
                                    .map((v, i) => `${i * 50},${120 - v}`)
                                    .join(" ")} 300,120`}
                            />
                            <polyline
                                fill="none"
                                stroke="#0f172a"
                                strokeWidth="2"
                                points={progreso
                                    .map((v, i) => `${i * 50},${120 - v}`)
                                    .join(" ")}
                            />
                            {progreso.map((v, i) => (
                                <circle
                                    key={i}
                                    cx={i * 50}
                                    cy={120 - v}
                                    r="3"
                                    fill="#0f172a"
                                />
                            ))}
                        </svg>
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">
                        Diferencias por día
                    </div>
                    <div className="text-xs text-slate-500">Últimos 7 días</div>
                    <div className="mt-4 h-40 w-full">
                        <svg viewBox="0 0 280 120" className="h-full w-full">
                            {barras.map((v, i) => (
                                <rect
                                    key={i}
                                    x={i * 38 + 6}
                                    y={120 - v}
                                    width="24"
                                    height={v}
                                    rx="4"
                                    fill="#1e293b"
                                    opacity={i === barras.length - 1 ? 1 : 0.65}
                                />
                            ))}
                        </svg>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div className="rounded-xl border bg-white p-4 shadow-sm">
                    <div className="text-sm font-semibold text-slate-900">
                        Avance por ubicación
                    </div>
                    <div className="text-xs text-slate-500">Completado global</div>
                    <div className="mt-4 flex items-center gap-4">
                        <div className="h-28 w-28">
                            <svg viewBox="0 0 120 120" className="h-full w-full">
                                <circle cx="60" cy="60" r="46" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                                <circle
                                    cx="60"
                                    cy="60"
                                    r="46"
                                    fill="none"
                                    stroke="#0f172a"
                                    strokeWidth="12"
                                    strokeDasharray={`${donut * 289} 289`}
                                    strokeLinecap="round"
                                    transform="rotate(-90 60 60)"
                                />
                            </svg>
                        </div>
                        <div>
                            <div className="text-2xl font-semibold text-slate-900">74%</div>
                            <div className="text-xs text-slate-500">Meta 85%</div>
                            <div className="mt-2 text-xs text-slate-600">
                                Zonas críticas: 3
                            </div>
                        </div>
                    </div>
                </div>

                <div className="rounded-xl border bg-white p-4 shadow-sm lg:col-span-2">
                    <div className="text-sm font-semibold text-slate-900">
                        Pendientes por tipo
                    </div>
                    <div className="text-xs text-slate-500">
                        Ítems sin gestionar
                    </div>
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { label: "Faltantes", value: "41" },
                            { label: "Sobrantes", value: "27" },
                            { label: "Sin ubicación", value: "19" },
                            { label: "Lote inválido", value: "9" },
                        ].map((item) => (
                            <div key={item.label} className="rounded-lg border bg-slate-50 p-3">
                                <div className="text-xs text-slate-500">{item.label}</div>
                                <div className="text-lg font-semibold text-slate-900">
                                    {item.value}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Dashboard;
