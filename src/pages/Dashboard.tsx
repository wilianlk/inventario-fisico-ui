const Dashboard = () => {
    return (
        <section className="space-y-6">
            {/* Encabezado */}
            <header className="space-y-1">
                <h1 className="text-3xl font-semibold text-slate-900">
                    Bienvenido al Inventario Físico
                </h1>
                <p className="text-sm text-slate-600">
                    Selecciona una opción del menú superior para comenzar.
                </p>
            </header>

            {/* Tarjetas de resumen */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                    <h2 className="text-sm font-medium text-slate-700">
                        Operaciones abiertas
                    </h2>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">0</p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                    <h2 className="text-sm font-medium text-slate-700">
                        Conteos pendientes
                    </h2>
                    <p className="mt-3 text-3xl font-semibold text-slate-900">0</p>
                </div>

                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200">
                    <h2 className="text-sm font-medium text-slate-700">
                        Último DI81 generado
                    </h2>
                    <p className="mt-3 text-sm text-slate-600">
                        Aún no se ha generado ningún archivo.
                    </p>
                </div>
            </div>
        </section>
    );
};

export default Dashboard;
