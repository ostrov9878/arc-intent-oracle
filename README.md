**arc-intent-oracle**

A working on-chain intent oracle built on Arc Testnet.
Users connect their wallet, perform real on-chain actions (Send / Swap), and receive a sarcastic prediction seeded from the transaction hash.
| Action        | Status    | Details                                       | Contract / SDK      |
| ------------- | --------- | --------------------------------------------- | ------------------- |
| Send          | ✅ Working | 0.01 USDC to yourself via Circle App Kit      | App Kit             |
| Swap          | ✅ Working | USDC ↔ EURC via ApexiSwap Router (WUSDC wrap) | ApexiSwap Router v1 |
| Volume Events | ✅ Working | Link to ApexiSwap trading competitions        | ApexiSwap           |
| Bridge        | ❌ Removed | Unstable on testnet (App Kit + CCTP)          | —                   |

**Quick start**
**1. Clone and install**
git clone https://github.com/ostrov9878/arc-intent-oracle.git
cd arc-intent-oracle
npm install

**2. Create .env**
cp .env.example .env
Add your VITE_KIT_KEY (only needed for Send):
VITE_KIT_KEY=your-kit-key-here
Get it from Circle Developer Console.

**3. Run locally**
npm run dev

Open: http://localhost:5173

**4. Deploy to GitHub Pages**
npm run deploy

**How it works**
1.Connect Rabby / MetaMask to Arc Testnet (Chain ID 5042002)
2.Get test USDC from faucet: https://faucet.circle.com
3.Choose an action:
-Send — real 0.01 USDC transfer
-Swap — real ApexiSwap USDC ↔ EURC
-Volume Events — opens Apexi competitions

Each action returns a sarcastic on-chain prediction based on the real transaction hash.

**Tech stack**
-React 19 + Vite + Tailwind
-viem (wallet + contract calls)
-ApexiSwap Router v1 (swapExactTokensForTokens)
-Circle App Kit (Send only)
-WUSDC wrapping logic

**Known issues**
Bridge disabled (Circle testnet CCTP via App Kit is unstable)
Some wallets may show harmless console warnings on Arc Testnet

**Links**
Live demo: https://ostrov9878.github.io/arc-intent-oracle
ApexiSwap: https://www.apexiswap.com
Volume Events: https://www.apexiswap.com/volume-events
Arc Explorer: https://testnet.arcscan.app

**License**

MIT

**GitHub Actions (Deploy)**

File: .github/workflows/deploy.yml

name: Deploy to GitHub Pages

on:
  push:
    branches: [ main ]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm install
      - run: npm run build

      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest

    permissions:
      pages: write
      id-token: write

    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}

    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
        
