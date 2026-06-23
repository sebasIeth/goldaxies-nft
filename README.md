# GoldAxis NFT Explorer

Aplicación **full-stack Web3** para explorar y visualizar la colección NFT **Golden Baboons Mining Club (GBMC)** en Ethereum. Incluye un contrato inteligente ERC-721 propio (desplegable con Hardhat) y un explorador web moderno construido con Next.js que lee la blockchain en tiempo real, conecta wallets vía MetaMask y resuelve metadata e imágenes alojadas en IPFS.

![Stack](https://img.shields.io/badge/Solidity-0.8.28-363636?logo=solidity)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![Ethers](https://img.shields.io/badge/ethers.js-6-2535A0)

---

## 🎯 Qué hace

- **Explora una colección NFT** (GBMC, 8.888 piezas) directamente desde la blockchain de Ethereum, sin depender de APIs centralizadas.
- **Conecta tu wallet** (MetaMask) y detecta automáticamente qué NFTs de la colección posee tu dirección, escaneando el contrato on-chain.
- **Lee metadata e imágenes desde IPFS** con sistema de *fallback* entre múltiples gateways (Cloudflare, dweb.link, ipfs.io) para máxima disponibilidad.
- **Muestra cada NFT en detalle**: nombre, descripción, atributos/traits, propietario (owner) y enlaces directos a OpenSea y Etherscan.
- **Modo demo**: si no conectas wallet (o no tienes NFTs de la colección), muestra una selección de ejemplo para que la app sea navegable de inmediato.
- **Bilingüe**: interfaz en español e inglés con un toggle (i18n integrado).
- **Incluye un contrato ERC-721 propio** (`PolyNFT`) listo para desplegar y mintear tus propios NFTs con metadata en IPFS.

---

## 🏗️ Arquitectura

El proyecto se divide en dos capas que se comunican a través de un archivo de configuración generado en el despliegue (`frontend/src/app/contract.json`, que contiene la **dirección del contrato** y su **ABI**).

```
polygon-nft-app/
├── contracts/
│   └── PolyNFT.sol          → Contrato ERC-721 (OpenZeppelin)
├── scripts/
│   └── deploy.js            → Despliega y exporta address + ABI al frontend
├── hardhat.config.js        → Configuración de red (Polygon) y compilador
├── artifacts/ · cache/      → Salida de compilación de Hardhat
│
└── frontend/                → App Next.js (App Router)
    └── src/app/
        ├── page.tsx
        ├── layout.tsx
        ├── globals.css      → Tema "gold/aurora" + Tailwind v4
        ├── contract.json    → Generado por deploy.js (address + ABI)
        └── components/
            └── NFTApp.tsx    → Lógica principal del explorador
```

### Flujo de datos

1. **Despliegue** → `deploy.js` compila y despliega el contrato, luego escribe `address` + `abi` en `contract.json`.
2. **Lectura on-chain** → el frontend instancia el contrato con `ethers.js` y un `JsonRpcProvider` público de Ethereum.
3. **Detección de propiedad** → al conectar la wallet se consulta `balanceOf` y se escanea `ownerOf` para encontrar los tokens del usuario.
4. **Resolución de metadata** → por cada token se llama a `tokenURI`, se descarga el JSON desde IPFS y se renderiza la imagen y los atributos.

---

## 🛠️ Tecnologías

### Smart Contract (capa blockchain)
| Tecnología | Uso |
|---|---|
| **Solidity 0.8.28** | Lenguaje del contrato (EVM target: Cancun) |
| **OpenZeppelin Contracts v5** | Base segura y auditada de `ERC721` + `ERC721URIStorage` |
| **Hardhat** | Compilación, testing y despliegue |
| **ethers.js v6** | Interacción con la red en los scripts |
| **dotenv** | Manejo de claves privadas y secretos vía `.env` |

El contrato `PolyNFT` (símbolo `PNFT`) implementa:
- `mint(string uri)` — acuña un NFT al `msg.sender` con metadata IPFS y devuelve el `tokenId`.
- `totalMinted()` — total de tokens acuñados.
- Almacenamiento de URIs por token vía `ERC721URIStorage`.
- Evento `NFTMinted(address, tokenId, tokenURI)` para indexación.

### Frontend (capa de aplicación)
| Tecnología | Uso |
|---|---|
| **Next.js 16** (App Router) | Framework React, exportación estática (`output: "export"`) |
| **React 19** | UI declarativa con hooks |
| **TypeScript 5** | Tipado estático |
| **ethers.js v6** | Lectura del contrato y conexión de wallet (`BrowserProvider`) |
| **Tailwind CSS v4** | Estilos (tema dorado + fondo "aurora") |
| **lucide-react** | Iconografía |
| **IPFS** | Almacenamiento descentralizado de metadata e imágenes |

> ℹ️ El frontend está configurado como **sitio estático** (`next.config.ts → output: "export"`), lo que permite desplegarlo en Vercel, Netlify, IPFS o cualquier hosting de archivos estáticos sin servidor.

---

## 🚀 Puesta en marcha

### Requisitos
- Node.js 18+
- Una wallet con MATIC/ETH para gas (solo si vas a desplegar)
- MetaMask en el navegador (para conectar wallet en el frontend)

### 1. Contrato (Hardhat)

```bash
# Desde la raíz del proyecto
npm install

# Configura tus credenciales
cp .env.example .env
# Edita .env con tu PRIVATE_KEY y RPC_URL

# Compila
npx hardhat compile

# Despliega (red configurada en hardhat.config.js)
npx hardhat run scripts/deploy.js --network polygon
```

Al desplegar, la dirección y el ABI se escriben automáticamente en `frontend/src/app/contract.json`, dejando el frontend listo para apuntar a tu contrato.

### 2. Frontend (Next.js)

```bash
cd frontend
npm install

# Servidor de desarrollo
npm run dev
# → http://localhost:3000

# Build estático de producción
npm run build   # genera la carpeta out/
```

---

## ⚙️ Configuración

### Variables de entorno (raíz, `.env`)
```env
PRIVATE_KEY=tu_private_key_aqui      # clave de la wallet que despliega
RPC_URL=https://rpc-amoy.polygon.technology
```

> ⚠️ **Nunca** subas tu `.env` ni tu clave privada a un repositorio público.

### Colección y red (frontend)
La colección, los gateways de IPFS y el RPC se configuran al inicio de [`NFTApp.tsx`](frontend/src/app/components/NFTApp.tsx):

```ts
const ETH_RPC = "https://ethereum-rpc.publicnode.com";
const IPFS_GATEWAYS = [ /* cloudflare, dweb, ipfs.io */ ];
const COLLECTION = { name: "Golden Baboons Mining Club", symbol: "GBMC", ... };
```

---

## 📦 Despliegue del frontend

Al ser una exportación estática, basta con servir la carpeta `frontend/out/`:

- **Vercel** — detecta Next.js automáticamente.
- **Netlify / Cloudflare Pages** — directorio de publicación: `frontend/out`.
- **IPFS / hosting estático** — sube el contenido de `out/`.

---

## 📝 Licencia

Contrato bajo licencia **MIT**. Proyecto desarrollado para **GoldAxis**.

---

*Powered by [GoldAxis](https://goldaxis.com)*
