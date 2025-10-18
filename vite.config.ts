import path from "path" // 1. Importe o 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', // Mantém o app do usuário sempre atualizado
      manifest: {
        name: 'StockSystem - Gestão de Estoque', // Nome completo do app
        short_name: 'StockSystem', // Nome curto que aparece sob o ícone
        description: 'Sistema de gestão de estoque e validade de produtos.',
        theme_color: '#1a1a1a', // Cor da barra de status no celular
        background_color: '#1a1a1a', // Cor da tela de "splash" ao abrir
        display: 'standalone', // Faz o app abrir sem a barra do navegador
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png', // Caminho para o ícone
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png', // Caminho para o ícone maior
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable' // Ícone especial para melhor visualização no Android
          }
        ]
      }
    })
  ],
  resolve: { // 2. Adicione esta seção 'resolve'
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})