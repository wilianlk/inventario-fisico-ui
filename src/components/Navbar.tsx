import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
    Home, Boxes, ClipboardList, BarChart2, FileSpreadsheet, Menu, X, Users, LogOut,
} from "lucide-react";

export function Navbar() {
    const location = useLocation();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);

    const items = [
        { path: "/", label: "Inicio", icon: Home },
        { path: "/grupos", label: "Grupos", icon: Users },
        { path: "/operaciones", label: "Operaciones", icon: Boxes },
        { path: "/conteos", label: "Conteos", icon: ClipboardList },
        { path: "/consolidacion", label: "Consolidación", icon: BarChart2 },
        { path: "/auditoria", label: "Auditoría", icon: FileSpreadsheet },
    ];

    const handleLogout = () => {
        localStorage.removeItem("usuario");
        localStorage.removeItem("rol");
        window.dispatchEvent(new Event("auth-changed"));
        setOpen(false);
        navigate("/login", { replace: true });
    };

    return (
        <nav className="w-full sticky top-0 z-50 border-b border-slate-900 bg-slate-950 shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
                <div className="flex items-center gap-2 select-none">
                    <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-blue-500 to-cyan-400 flex items-center justify-center shadow-md">
                        <Boxes className="h-5 w-5 text-slate-950" />
                    </div>
                    <div className="leading-tight">
                        <div className="text-sm font-semibold tracking-wider text-slate-100 uppercase">Inventario Físico</div>
                        <div className="text-xs text-slate-400">IBES · Recuento · DI81</div>
                    </div>
                </div>

                <button
                    className="inline-flex items-center justify-center rounded-lg p-2 text-slate-200 hover:bg-slate-800 md:hidden transition"
                    onClick={() => setOpen((prev) => !prev)}
                >
                    {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>

                <ul className="hidden items-center gap-2 md:flex">
                    {items.map((item) => {
                        const Icon = item.icon;
                        const active = location.pathname === item.path;

                        return (
                            <li key={item.path}>
                                <Link
                                    to={item.path}
                                    className={cn(
                                        "flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium tracking-wide transition-all",
                                        "hover:bg-slate-800/70 hover:text-slate-50 hover:shadow-md",
                                        active
                                            ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-slate-950 shadow-lg"
                                            : "text-slate-300"
                                    )}
                                >
                                    <Icon className={cn("h-4 w-4", active && "text-slate-950")} />
                                    <span>{item.label}</span>
                                </Link>
                            </li>
                        );
                    })}

                    <li>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className={cn(
                                "flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium tracking-wide transition-all",
                                "text-red-200 hover:bg-red-500/20 hover:text-red-100 hover:shadow-md"
                            )}
                        >
                            <LogOut className="h-4 w-4 text-red-200" />
                            <span>Cerrar sesión</span>
                        </button>
                    </li>
                </ul>
            </div>

            {open && (
                <div className="border-t border-slate-800 bg-slate-950 md:hidden">
                    <ul className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3">
                        {items.map((item) => {
                            const Icon = item.icon;
                            const active = location.pathname === item.path;

                            return (
                                <li key={item.path}>
                                    <Link
                                        to={item.path}
                                        onClick={() => setOpen(false)}
                                        className={cn(
                                            "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                                            "hover:bg-slate-800/80 hover:text-slate-50",
                                            active
                                                ? "bg-gradient-to-r from-blue-500 to-cyan-400 text-slate-950 shadow-md"
                                                : "text-slate-300"
                                        )}
                                    >
                                        <Icon className="h-5 w-5" />
                                        <span>{item.label}</span>
                                    </Link>
                                </li>
                            );
                        })}

                        <li>
                            <button
                                type="button"
                                onClick={handleLogout}
                                className={cn(
                                    "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                                    "text-slate-300 hover:bg-slate-800/80 hover:text-slate-50"
                                )}
                            >
                                <LogOut className="h-5 w-5" />
                                <span>Cerrar sesión</span>
                            </button>
                        </li>
                    </ul>
                </div>
            )}
        </nav>
    );
}

export default Navbar;
