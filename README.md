# arc-intent-oracle

A working on-chain "intent oracle" built on Arc Testnet.

Users connect their wallet, perform real on-chain actions (Send / Swap), and receive a sarcastic prediction seeded from the transaction hash.

## What actually works

| Action        | Status     | Details                                              | Contract / SDK             |
|---------------|------------|------------------------------------------------------|----------------------------|
| Send          | ✅ Working | 0.01 USDC to yourself via Circle App Kit             | App Kit                    |
| Swap          | ✅ Working | USDC ↔ EURC via ApexiSwap Router (with WUSDC wrap)   | ApexiSwap Router v1        |
| Volume Events | ✅ Working | Direct link to ApexiSwap trading competitions        | ApexiSwap                  |
| Bridge        | ❌ Removed | Unstable on testnet (App Kit + CCTP)                 | —                          |

## Quick start

### 1. Clone and install

```bash
git clone https://github.com/ostrov9878/arc-intent-oracle.git
cd arc-intent-oracle
npm install
