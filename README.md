# arc-intent-oracle

A beautiful wallet-connect app on Arc Testnet powered by Arc App Kit.

## What actually works

- **Send 0.01 USDC** — stable and reliable
- **Swap USDC ↔ EURC** — experimental (often fails on testnet)
- **Bridge USDC** (both directions) — experimental (burn works, mint often doesn't complete)

## Quick start

1. `cp .env.example .env`
2. Get a free **Kit Key** at https://console.circle.com/ (Keys → Kit Keys)
3. Paste it in `.env`:
   ```
   VITE_KIT_KEY=KIT_KEY:your-key-here
   ```
4. `npm install && npm run dev`

## Important note about Arc Testnet

Circle testnet services (Stablecoin Service, iris-api) frequently return 404 and timeouts.  
Swap and Bridge may not complete, but the app always delivers a beautiful sarcastic prediction.

## Stack

Vite + React + Tailwind + Arc App Kit + viem

## Deploy to GitHub Pages

```bash
npm run deploy
```