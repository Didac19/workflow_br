import { useState } from "react";
import BranchEditor from "./components/BranchEditor";
import ProductSelector from "./components/ProductSelector";
import Login from "./components/Login";
import { Product } from "./services/api";
import { useAuth } from "./context/AuthContext";

function App() {
  const [selectedProduct, setSelectedProduct] = useState<Product | undefined>();
  const { isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <main className="w-screen h-screen overflow-hidden bg-background flex flex-col">
      <div className="absolute top-6 left-6 z-60 flex gap-4 items-start">
        <ProductSelector
          onSelect={setSelectedProduct}
          selectedProduct={selectedProduct}
        />
        <button
          onClick={logout}
          className="p-2 bg-secondary/50 hover:bg-red-500/20 text-red-500 border border-border rounded-lg transition-colors cursor-pointer"
          title="Cerrar sesión"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 w-full h-full">
        {selectedProduct ? (
          <BranchEditor selectedProduct={selectedProduct} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-center p-10 animate-fade-in">
            <div className="w-24 h-24 mb-6 rounded-3xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-4">Interfaz de Acciones</h1>
            <p className="text-gray-400 max-w-md mx-auto leading-relaxed">
              Conéctate a los datos de tu producto para comenzar a visualizar y editar el flujo de acciones en un editor intuitivo.
            </p>
            <div className="mt-8 px-4 py-2 bg-secondary/50 border border-gray-800 rounded-full text-xs text-gray-500 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              Esperando selección de producto...
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default App;
