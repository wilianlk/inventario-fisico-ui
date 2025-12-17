import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Dashboard from "@/pages/Dashboard";
import Grupos from "@/pages/Grupos";
import Operaciones from "@/pages/Operaciones";
import Conteos from "@/pages/Conteos";
import Consolidacion from "@/pages/Consolidacion";
import ConteoPorGrupo from "@/pages/ConteoPorGrupo";
import AuthLogin from "@/pages/AuthLogin";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const readSession = () => {
    const usuario = localStorage.getItem("usuario");
    const rol = localStorage.getItem("rol");
    return !!usuario && !!rol;
};

function App() {
    const [session, setSession] = useState(readSession());

    useEffect(() => {
        const sync = () => setSession(readSession());

        window.addEventListener("storage", sync);
        window.addEventListener("auth-changed", sync as EventListener);

        return () => {
            window.removeEventListener("storage", sync);
            window.removeEventListener("auth-changed", sync as EventListener);
        };
    }, []);

    return (
        <BrowserRouter>
            <div className="min-h-screen bg-slate-100 text-slate-900">
                {session ? <Navbar /> : null}

                <main className="mx-auto max-w-6xl px-4 py-8">
                    <Routes>
                        <Route path="/login" element={session ? <Navigate to="/" replace /> : <AuthLogin />} />

                        <Route path="/" element={session ? <Dashboard /> : <Navigate to="/login" replace />} />
                        <Route path="/grupos" element={session ? <Grupos /> : <Navigate to="/login" replace />} />
                        <Route path="/operaciones" element={session ? <Operaciones /> : <Navigate to="/login" replace />} />
                        <Route path="/conteos" element={session ? <Conteos /> : <Navigate to="/login" replace />} />
                        <Route path="/consolidacion" element={session ? <Consolidacion /> : <Navigate to="/login" replace />} />

                        <Route path="/conteo/:operacionId/:grupoId" element={<ConteoPorGrupo />} />

                        <Route path="*" element={<Navigate to={session ? "/" : "/login"} replace />} />
                    </Routes>
                </main>

                <ToastContainer position="top-right" autoClose={4000} pauseOnHover theme="light" />
            </div>
        </BrowserRouter>
    );
}

export default App;
