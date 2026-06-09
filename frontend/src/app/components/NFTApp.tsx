"use client";

import { useState, useEffect, useCallback } from "react";
import {
  JsonRpcProvider,
  BrowserProvider,
  Contract,
} from "ethers";
import { Waves, Globe, Search, Zap, Wallet, Languages } from "lucide-react";
import contractData from "../contract.json";

interface NFTAttribute {
  trait_type: string;
  value: string;
}

interface NFTMeta {
  name: string;
  description: string;
  image: string;
  tokenId: number;
  owner: string;
  attributes: NFTAttribute[];
  edition?: number;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        method: string;
        params?: unknown[];
      }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

const ETH_RPC = "https://ethereum-rpc.publicnode.com";
const IPFS_GATEWAYS = [
  "https://cloudflare-ipfs.com/ipfs/",
  "https://dweb.link/ipfs/",
  "https://ipfs.io/ipfs/",
];
const COLLECTION = {
  name: "Golden Baboons Mining Club",
  symbol: "GBMC",
  supply: 8888,
  holders: 492,
  creator: "Asia Broadband",
  opensea: "https://opensea.io/collection/golden-baboons-mining-club",
  web: "https://goldenbaboons.com",
  contract: contractData.address,
};

const MOCK_TOKEN_IDS = [1, 2, 3, 4, 5, 6];

const i18n = {
  en: {
    subtitle: "My NFTs · Golden Baboons Mining Club",
    connectMetaMask: "Connect MetaMask",
    connecting: "Connecting...",
    disconnect: "Disconnect",
    officialWeb: "Official Website",
    myNfts: "My NFTs",
    loading: "Loading...",
    loadingNfts: "Loading NFTs...",
    retry: "Retry",
    demo: "Demo",
    connectYourWallet: "Connect your wallet",
    noNftsWallet: "does not hold any GBMC NFTs. Showing sample collection.",
    wallet: "Wallet",
    properties: "Properties",
    viewOnOpensea: "View on OpenSea",
    close: "Close",
    enlargeImage: "Enlarge image",
    contract: "Contract",
    installMetamask: "Install MetaMask to connect your wallet",
  },
  es: {
    subtitle: "Mis NFTs · Golden Baboons Mining Club",
    connectMetaMask: "Conectar MetaMask",
    connecting: "Conectando...",
    disconnect: "Desconectar",
    officialWeb: "Web Oficial",
    myNfts: "Mis NFTs",
    loading: "Cargando...",
    loadingNfts: "Cargando NFTs...",
    retry: "Reintentar",
    demo: "Demo",
    connectYourWallet: "Conecta tu wallet",
    noNftsWallet: "no tiene NFTs de GBMC. Mostrando coleccion de ejemplo.",
    wallet: "Wallet",
    properties: "Propiedades",
    viewOnOpensea: "Ver en OpenSea",
    close: "Cerrar",
    enlargeImage: "Ampliar imagen",
    contract: "Contrato",
    installMetamask: "Instala MetaMask para conectar tu wallet",
  },
} as const;

type Lang = keyof typeof i18n;

function resolveIPFS(url: string, gatewayIndex = 0): string {
  if (!url) return "";
  if (url.startsWith("ipfs://")) {
    const cid = url.replace("ipfs://", "");
    return IPFS_GATEWAYS[gatewayIndex % IPFS_GATEWAYS.length] + cid;
  }
  return url;
}

function NFTCard({ nft, onClick }: { nft: NFTMeta; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      className="bg-background border border-border rounded-xl overflow-hidden hover:border-gold-700/40 hover:-translate-y-1 transition-all cursor-pointer group"
    >
      {nft.image ? (
        <img
          src={nft.image}
          alt={nft.name}
          className="w-full h-52 object-cover bg-border group-hover:brightness-110 transition-all"
          onError={(e) => {
            const img = e.target as HTMLImageElement;
            const currentSrc = img.src;
            for (let g = 0; g < IPFS_GATEWAYS.length; g++) {
              if (currentSrc.includes(IPFS_GATEWAYS[g])) {
                const next = (g + 1) % IPFS_GATEWAYS.length;
                if (next !== 0) {
                  const cid = currentSrc.split("/ipfs/")[1];
                  img.src = IPFS_GATEWAYS[next] + cid;
                  return;
                }
              }
            }
            img.src =
              "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect fill='%231f1f28' width='200' height='200'/%3E%3Ctext x='50%25' y='50%25' fill='%237a7a88' text-anchor='middle' dy='.3em' font-size='13'%3ENo Image%3C/text%3E%3C/svg%3E";
          }}
        />
      ) : (
        <div className="w-full h-52 bg-border flex items-center justify-center text-muted text-xs">
          No Image
        </div>
      )}
      <div className="p-3">
        <h3 className="text-sm font-semibold truncate">{nft.name}</h3>
        <p className="text-xs text-muted mt-1">Token #{nft.tokenId}</p>
      </div>
    </div>
  );
}

export default function NFTApp() {
  const [myNfts, setMyNfts] = useState<NFTMeta[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [selectedNft, setSelectedNft] = useState<NFTMeta | null>(null);
  const [fullImage, setFullImage] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [connectingWallet, setConnectingWallet] = useState(false);
  const [usingMock, setUsingMock] = useState(false);
  const [lang, setLang] = useState<Lang>("en");
  const t = i18n[lang];

  const provider = new JsonRpcProvider(ETH_RPC);
  const contract = new Contract(
    contractData.address,
    contractData.abi,
    provider
  );

  const fetchNFT = useCallback(
    async (tokenId: number): Promise<NFTMeta | null> => {
      try {
        const uri = await contract.tokenURI(tokenId);
        const owner = await contract.ownerOf(tokenId);

        let meta: NFTMeta = {
          name: `GBMC #${tokenId}`,
          description: "",
          image: "",
          tokenId,
          owner,
          attributes: [],
        };

        for (let g = 0; g < IPFS_GATEWAYS.length; g++) {
          try {
            const resolvedUri = resolveIPFS(uri, g);
            const res = await fetch(resolvedUri, {
              signal: AbortSignal.timeout(8000),
            });
            if (!res.ok) continue;
            const json = await res.json();
            meta = {
              ...meta,
              name: json.name || meta.name,
              description: json.description || "",
              image: resolveIPFS(json.image || "", g),
              attributes: json.attributes || [],
              edition: json.edition,
            };
            break;
          } catch {
            continue;
          }
        }

        return meta;
      } catch (e) {
        console.error(`Error fetching NFT #${tokenId}:`, e);
        return null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const loadBatch = useCallback(
    async (
      ids: number[],
      setter: React.Dispatch<React.SetStateAction<NFTMeta[]>>
    ) => {
      const loaded: NFTMeta[] = [];
      for (let i = 0; i < ids.length; i += 2) {
        const pair = ids.slice(i, i + 2);
        const results = await Promise.all(pair.map((id) => fetchNFT(id)));
        for (const nft of results) {
          if (nft) loaded.push(nft);
        }
        setter([...loaded]);
      }
      return loaded;
    },
    [fetchNFT]
  );

  // Find which tokens an address owns by scanning the contract
  const findOwnedTokens = useCallback(
    async (address: string): Promise<number[]> => {
      try {
        const balance = await contract.balanceOf(address);
        const count = Number(balance);
        if (count === 0) return [];

        // Scan tokens to find owned ones (check in batches)
        const owned: number[] = [];
        for (let i = 1; i <= COLLECTION.supply && owned.length < count; i++) {
          try {
            const owner = await contract.ownerOf(i);
            if (owner.toLowerCase() === address.toLowerCase()) {
              owned.push(i);
            }
          } catch {
            // token might not exist
          }
          // Don't scan forever — stop after checking 200 tokens
          // to keep it reasonable
          if (i > 200 && owned.length === 0) break;
        }
        return owned;
      } catch (e) {
        console.error("Error finding owned tokens:", e);
        return [];
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const loadNFTsForAddress = useCallback(
    async (address: string) => {
      setLoadingMine(true);
      setMyNfts([]);
      setUsingMock(false);

      // First check balance
      try {
        const balance = await contract.balanceOf(address);
        const count = Number(balance);

        if (count > 0) {
          // Address has NFTs — find them
          const owned = await findOwnedTokens(address);
          if (owned.length > 0) {
            await loadBatch(owned, setMyNfts);
            setLoadingMine(false);
            return;
          }
        }
      } catch (e) {
        console.error("Error checking balance:", e);
      }

      // No NFTs found — fall back to mock
      setUsingMock(true);
      await loadBatch(MOCK_TOKEN_IDS, setMyNfts);
      setLoadingMine(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [loadBatch, findOwnedTokens]
  );

  // Load mock on initial render
  const loadMock = useCallback(async () => {
    setLoadingMine(true);
    setUsingMock(true);
    await loadBatch(MOCK_TOKEN_IDS, setMyNfts);
    setLoadingMine(false);
  }, [loadBatch]);

  useEffect(() => {
    loadMock();
  }, [loadMock]);

  async function connectWallet() {
    if (!window.ethereum) {
      alert(t.installMetamask);
      return;
    }

    setConnectingWallet(true);
    try {
      const browserProvider = new BrowserProvider(window.ethereum);
      const signer = await browserProvider.getSigner();
      const address = await signer.getAddress();
      setWalletAddress(address);
      await loadNFTsForAddress(address);
    } catch (e) {
      console.error("Error connecting wallet:", e);
    } finally {
      setConnectingWallet(false);
    }
  }

  function disconnectWallet() {
    setWalletAddress(null);
    setUsingMock(true);
    setMyNfts([]);
    loadMock();
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Aurora background */}
      <div className="aurora-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
      </div>

      {/* Header */}
      <header className="relative overflow-hidden z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-gold-800/20 via-background to-background" />
        <div className="relative max-w-6xl mx-auto px-6 py-8 flex flex-col items-center text-center gap-4">
          <img
            src="https://goldaxis.com/images/goldaxis-isotipo-fullcolor.png"
            alt="GoldAxis"
            className="w-16 h-16 object-contain"
          />
          <div>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              <span className="bg-gradient-to-r from-gold-300 via-gold-500 to-gold-700 bg-clip-text text-transparent">
                GoldAxis
              </span>{" "}
              <span className="text-foreground/90">NFT Explorer</span>
            </h1>
            <p className="text-sm text-muted mt-2">{t.subtitle}</p>
          </div>

          {/* Lang toggle + Wallet */}
          <div className="mt-1 flex items-center gap-4">
            <button
              onClick={() => setLang(lang === "en" ? "es" : "en")}
              className="flex items-center gap-1.5 bg-card border border-border hover:border-gold-700/50 px-3 py-2 rounded-lg text-xs text-muted hover:text-gold-400 transition-all cursor-pointer"
            >
              <Languages size={14} />
              {lang === "en" ? "ES" : "EN"}
            </button>
            {walletAddress ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-card border border-gold-700/30 px-4 py-2 rounded-lg">
                  <div className="w-2 h-2 bg-success rounded-full" />
                  <span className="text-xs text-foreground">
                    pepito123
                  </span>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  {t.disconnect}
                </button>
              </div>
            ) : (
              <button
                onClick={connectWallet}
                disabled={connectingWallet}
                className="flex items-center gap-2 bg-gradient-to-r from-gold-600 to-gold-700 hover:from-gold-500 hover:to-gold-600 disabled:opacity-50 text-black font-medium px-5 py-2.5 rounded-lg text-sm transition-all cursor-pointer disabled:cursor-not-allowed shadow-md shadow-gold-700/20"
              >
                <Wallet size={16} />
                {connectingWallet ? t.connecting : t.connectMetaMask}
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Links */}
        <div className="flex justify-center gap-3 flex-wrap">
          {[
            { label: "OpenSea", href: COLLECTION.opensea, Icon: Waves },
            { label: t.officialWeb, href: COLLECTION.web, Icon: Globe },
            {
              label: "Etherscan",
              href: `https://etherscan.io/address/${COLLECTION.contract}`,
              Icon: Search,
            },
            { label: "GoldAxis", href: "https://goldaxis.com", Icon: Zap },
          ].map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-card border border-border hover:border-gold-700/50 px-4 py-2 rounded-lg text-xs text-muted hover:text-gold-400 transition-all"
            >
              <l.Icon size={14} />
              {l.label}
            </a>
          ))}
        </div>

        {/* Mis NFTs */}
        <section className="bg-card/50 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-medium text-gold-500 uppercase tracking-wider">
              {t.myNfts}
            </h2>
            <div className="flex items-center gap-3">
              {loadingMine && (
                <span className="text-xs text-gold-500 animate-pulse">
                  {t.loading}
                </span>
              )}
              {usingMock && !loadingMine && (
                <span className="text-xs text-muted">
                  {t.demo} &middot;{" "}
                  <button
                    onClick={connectWallet}
                    className="text-gold-500 hover:text-gold-300 underline cursor-pointer"
                  >
                    {t.connectYourWallet}
                  </button>
                </span>
              )}
            </div>
          </div>

          {/* No NFTs found with wallet connected */}
          {walletAddress && usingMock && !loadingMine && (
            <div className="bg-background border border-border rounded-lg p-4 mb-4">
              <p className="text-sm text-muted text-center">
                La wallet{" "}
                <span className="text-foreground">
                  {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                </span>{" "}
                {t.noNftsWallet}
              </p>
            </div>
          )}

          {myNfts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {myNfts.map((nft) => (
                <NFTCard
                  key={nft.tokenId}
                  nft={nft}
                  onClick={() => setSelectedNft(nft)}
                />
              ))}
            </div>
          ) : !loadingMine ? (
            <div className="text-center py-8">
              <p className="text-muted text-sm">{t.loadingNfts}</p>
              <button
                onClick={loadMock}
                className="mt-3 bg-gradient-to-r from-gold-600 to-gold-700 hover:from-gold-500 hover:to-gold-600 text-black font-medium px-6 py-2.5 rounded-lg text-sm transition-all cursor-pointer shadow-md shadow-gold-700/20"
              >
                {t.retry}
              </button>
            </div>
          ) : null}
        </section>

        {/* Footer */}
        <footer className="text-center space-y-2 pt-4 pb-8 border-t border-border">
          <p className="text-xs text-muted">
            {t.contract}:{" "}
            <a
              href={`https://etherscan.io/address/${COLLECTION.contract}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-500 hover:text-gold-300 transition-colors"
            >
              {COLLECTION.contract}
            </a>
          </p>
          <p className="text-xs text-muted/60">
            Powered by{" "}
            <a
              href="https://goldaxis.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-600 hover:text-gold-400 transition-colors"
            >
              GoldAxis
            </a>
          </p>
        </footer>
      </main>

      {/* Modal */}
      {selectedNft && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedNft(null)}
        >
          <div
            className="bg-card border border-border-light rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl shadow-black/50"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedNft.image && (
              <div
                className="relative group cursor-zoom-in"
                onClick={() => setFullImage(selectedNft.image)}
              >
                <img
                  src={selectedNft.image}
                  alt={selectedNft.name}
                  className="w-full h-60 object-cover group-hover:brightness-110 transition-all"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                  <span className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full">
                    {t.enlargeImage}
                  </span>
                </div>
              </div>
            )}
            <div className="p-4 space-y-3 max-h-[50vh] overflow-y-auto">
              <div>
                <h3 className="text-lg font-bold">{selectedNft.name}</h3>
                <p className="text-sm text-gold-500 mt-0.5">
                  Token #{selectedNft.tokenId}
                  {selectedNft.edition != null && (
                    <span className="text-muted">
                      {" "}
                      &middot; Edition {selectedNft.edition}
                    </span>
                  )}
                </p>
              </div>

              {selectedNft.description && (
                <p className="text-sm text-foreground/60 leading-relaxed line-clamp-3">
                  {selectedNft.description}
                </p>
              )}

              {/* Attributes / Traits */}
              {selectedNft.attributes.length > 0 && (
                <div>
                  <p className="text-xs text-muted uppercase tracking-wider mb-2">
                    {t.properties}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {selectedNft.attributes.map((attr, i) => (
                      <div
                        key={i}
                        className="bg-background border border-border rounded-lg px-2 py-2 text-center"
                      >
                        <p className="text-[10px] text-gold-600 uppercase tracking-wider">
                          {attr.trait_type.replace(/_/g, " ")}
                        </p>
                        <p className="text-sm font-medium text-foreground mt-0.5 capitalize truncate">
                          {attr.value.replace(/_/g, " ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Owner */}
              <div>
                <p className="text-xs text-muted uppercase tracking-wider mb-1">
                  Owner
                </p>
                <a
                  href={`https://etherscan.io/address/${selectedNft.owner}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-gold-500 hover:text-gold-300 break-all transition-colors"
                >
                  {selectedNft.owner}
                </a>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <a
                  href={`https://opensea.io/assets/ethereum/${COLLECTION.contract}/${selectedNft.tokenId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center bg-gradient-to-r from-gold-600 to-gold-700 hover:from-gold-500 hover:to-gold-600 text-black font-medium py-2 rounded-lg text-xs transition-all shadow-md shadow-gold-700/20"
                >
                  {t.viewOnOpensea}
                </a>
                <button
                  onClick={() => setSelectedNft(null)}
                  className="flex-1 border border-border hover:border-gold-800/50 text-foreground py-2 rounded-lg text-xs transition-colors cursor-pointer"
                >
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen image */}
      {fullImage && (
        <div
          className="fixed inset-0 bg-black/95 flex items-center justify-center z-[60] p-4 cursor-zoom-out"
          onClick={() => setFullImage(null)}
        >
          <img
            src={fullImage}
            alt="NFT"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      )}
    </div>
  );
}
