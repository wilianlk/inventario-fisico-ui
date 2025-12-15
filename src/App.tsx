import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Dashboard from "@/pages/Dashboard";
import Grupos from "@/pages/Grupos";
import Operaciones from "@/pages/Operaciones";
import Conteos from "@/pages/Conteos";
import Consolidacion from "@/pages/Consolidacion";
import ConteoPorGrupo from "@/pages/ConteoPorGrupo";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen bg-slate-100 text-slate-900">
                <Navbar />

                <main className="mx-auto max-w-6xl px-4 py-8">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/grupos" element={<Grupos />} />
                        <Route path="/operaciones" element={<Operaciones />} />
                        <Route path="/conteos" element={<Conteos />} />
                        <Route path="/consolidacion" element={<Consolidacion />} />
                        <Route path="/conteo/:operacionId/:grupoId" element={<ConteoPorGrupo />} />
                    </Routes>
                </main>

                <ToastContainer position="top-right" autoClose={4000} pauseOnHover theme="light" />
            </div>
        </BrowserRouter>
    );
}

export default App;
