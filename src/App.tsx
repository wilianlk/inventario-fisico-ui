// src/App.tsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Dashboard from "@/pages/Dashboard";
import Operaciones from "@/pages/Operaciones";
import Grupos from "@/pages/Grupos";
import Conteos from "@/pages/Conteos";

// Notificaciones globales
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

function App() {
    return (
        <BrowserRouter>
            <div className="min-h-screen bg-slate-100 text-slate-900">
                {/* Barra superior */}
                <Navbar />

                {/* Contenido principal */}
                <main className="mx-auto max-w-6xl px-4 py-8">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/operaciones" element={<Operaciones />} />
                        <Route path="/grupos" element={<Grupos />} />
                        <Route path="/conteos" element={<Conteos />} />
                    </Routes>
                </main>

                {/* Contenedor de toasts */}
                <ToastContainer
                    position="top-right"
                    autoClose={4000}
                    pauseOnHover
                    theme="light"
                />
            </div>
        </BrowserRouter>
    );
}

export default App;
