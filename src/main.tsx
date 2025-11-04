import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App"; // Correção 1: Importação padrão
import { registerSW } from "virtual:pwa-register";
import "./index.css"; // Estilos globais do Tailwind

// Registra o Service Worker apenas em modo de produção.
if (import.meta.env.PROD) {
  registerSW({ immediate: true });
  console.log("✅ Service Worker registrado (Modo de Produção).");
} else {
  console.warn("⚠️ Service Worker não registrado (Modo de Desenvolvimento).");
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
