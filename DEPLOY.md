# Guia de Deploy do Frontend

Este guia descreve como fazer deploy do frontend React/Vite no Vercel (ou outros serviços).

## Pré-requisitos

1. Conta no Vercel (ou outro serviço de hospedagem)
2. Repositório Git (GitHub, GitLab, etc) com o código do frontend
3. Backend Django já deployado e funcionando

## Deploy no Vercel

### 1. Conectar Repositório

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Clique em **Add New Project**
3. Conecte seu repositório Git
4. Selecione a pasta `frontend` como **Root Directory**

### 2. Configuração do Projeto

O Vercel detectará automaticamente que é um projeto Vite, mas você pode configurar manualmente:

- **Framework Preset**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### 3. Variáveis de Ambiente

Configure as seguintes variáveis de ambiente no Vercel:

#### Obrigatórias:
- `VITE_API_URL`: URL do backend Django em produção
  - Exemplo: `https://pi2-stocksystem-backend.onrender.com`

#### Opcionais:
- `VITE_API_BASE_URL`: URL alternativa da API (se não usar `VITE_API_URL`)
- `VITE_VAPID_PUBLIC_KEY`: Chave pública VAPID para Push Notifications
  - Obtenha esta chave do backend (gerada via `gerar_chaves_vapid.py`)

### 4. Deploy

1. Clique em **Deploy**
2. O Vercel irá:
   - Instalar dependências (`npm install`)
   - Executar o build (`npm run build`)
   - Fazer deploy dos arquivos estáticos

### 5. Verificar Deploy

Após o deploy:
1. Acesse a URL fornecida pelo Vercel
2. Verifique se o frontend carrega corretamente
3. Teste a conexão com o backend (verifique o console do navegador)

## Deploy em Outros Serviços

### Netlify

1. Crie um arquivo `netlify.toml` na raiz do frontend:
```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

2. Configure as variáveis de ambiente no Netlify Dashboard
3. Conecte o repositório e faça deploy

### Render.com (Static Site)

1. No Render Dashboard, clique em **New +** → **Static Site**
2. Conecte repositório
3. Configure:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. Configure variáveis de ambiente

### GitHub Pages

1. Instale `gh-pages`: `npm install --save-dev gh-pages`
2. Adicione ao `package.json`:
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```
3. Configure `base` no `vite.config.ts` para o nome do repositório
4. Execute `npm run deploy`

## Variáveis de Ambiente

### Desenvolvimento Local

Crie um arquivo `.env.local` na raiz do frontend:

```env
VITE_API_URL=http://localhost:8000
VITE_VAPID_PUBLIC_KEY=sua-chave-publica-aqui
```

### Produção

Configure as variáveis no painel do serviço de hospedagem:

- **Vercel**: Settings → Environment Variables
- **Netlify**: Site settings → Environment variables
- **Render**: Environment Variables

## Troubleshooting

### Problema: Erro 404 ao navegar entre páginas

**Solução**: Configure rewrites/redirects para servir `index.html` para todas as rotas.

No Vercel, isso é configurado automaticamente pelo `vercel.json`.

### Problema: API não conecta

**Solução**: 
1. Verifique se `VITE_API_URL` está configurada corretamente
2. Verifique CORS no backend Django
3. Verifique o console do navegador para erros

### Problema: Service Worker não funciona

**Solução**:
1. Service Workers só funcionam em HTTPS (exceto localhost)
2. Verifique se o Service Worker está sendo registrado corretamente
3. Verifique os headers no `vercel.json`

### Problema: Build falha

**Solução**:
1. Verifique os logs de build no Vercel
2. Teste localmente: `npm run build`
3. Verifique se todas as dependências estão no `package.json`

## Estrutura de Arquivos

```
frontend/
├── dist/              # Pasta de build (gerada)
├── public/            # Arquivos estáticos
├── src/               # Código fonte
├── .env.example       # Exemplo de variáveis de ambiente
├── vercel.json        # Configuração do Vercel
├── vite.config.ts     # Configuração do Vite
└── package.json       # Dependências e scripts
```

## Comandos Úteis

```bash
# Desenvolvimento local
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview

# Lint
npm run lint
```

## Notas

- O frontend detecta automaticamente se está em `localhost` e usa a URL apropriada
- Push Notifications requerem HTTPS em produção
- Service Worker funciona apenas em HTTPS (exceto localhost)
- Certifique-se de que o backend está configurado para aceitar requisições do domínio do frontend (CORS)

