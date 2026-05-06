# arc-intent-oracle

A working on-chain "intent oracle" built on Arc Testnet.

Users connect their wallet, perform real on-chain actions (Send / Swap), and receive a sarcastic prediction seeded from the transaction hash.

## **What actually works**

| Action | Status | Details | Contract / SDK |
| --- | --- | --- | --- |
| Send | ✅ Working | 0.01 USDC to yourself via Circle App Kit | App Kit |
| Swap | ✅ Working | USDC ↔ EURC via ApexiSwap Router (with WUSDC wrap) | ApexiSwap Router v1 |
| Volume Events | ✅ Working | Direct link to ApexiSwap trading competitions | ApexiSwap |
| Bridge | ❌ Removed | Unstable on testnet (App Kit + CCTP) | — |

## **Quick start**

### **1. Clone and install**

```bash
git clone https://github.com/ostrov9878/arc-intent-oracle.git
cd arc-intent-oracle
npm install
```

### **2. Create `.env`**

Copy `.env.example` to `.env`.

Add your **VITE_KIT_KEY** (only needed for Send):

```env
VITE_KIT_KEY=your-kit-key-here
```

Get it from [Circle Developer Console](https://console.circle.com).

### **3. Run locally**

```bash
npm run dev
```

Open `http://localhost:5173`

### **4. Deploy to GitHub Pages**

Push to `main` and GitHub Actions will deploy automatically.

## **How it works**

1. Connect Rabby / MetaMask to **Arc Testnet** (Chain ID `5042002`)
2. Get test USDC from [faucet.circle.com](https://faucet.circle.com)
3. Choose an action:
   - **Send** — real 0.01 USDC transfer
   - **Swap** — real ApexiSwap USDC ↔ EURC
   - **Volume Events** — open ApexiSwap trading competitions
4. Every action returns a sarcastic on-chain prediction based on the real tx hash.

## **Tech stack**

- React 19 + Vite + Tailwind
- viem (wallet + contract calls)
- ApexiSwap Router v1
- Circle App Kit (only for Send)
- WUSDC wrapping logic for native USDC

## **Known issues**

- Bridge is disabled (Circle testnet CCTP via App Kit is unstable)
- Some wallets show harmless console noise on Arc Testnet

## **Links**

- **Live demo**: https://ostrov9878.github.io/arc-intent-oracle
- **ApexiSwap**: https://www.apexiswap.com
- **Volume Events**: https://www.apexiswap.com/volume-events
- **Arc Testnet Explorer**: https://testnet.arcscan.app

## **License**

MIT