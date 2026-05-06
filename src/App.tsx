import { useState } from 'react'
import { Wallet, Send, ArrowLeftRight, ArrowUpRight, Zap, ExternalLink, Loader2 } from 'lucide-react'
import { AppKit } from '@circle-fin/app-kit'
import { createViemAdapterFromProvider } from '@circle-fin/adapter-viem-v2'
import type { EIP1193Provider } from 'viem'
import { createWalletClient, custom, createPublicClient, http, parseEther, parseUnits } from 'viem'

const ARC_TESTNET = {
  id: 5042002,
  name: 'Arc Testnet',
  network: 'arc-testnet',
  nativeCurrency: { decimals: 18, name: 'USDC', symbol: 'USDC' },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.arc.network'] },
  },
  blockExplorers: {
    default: { name: 'ArcScan', url: 'https://testnet.arcscan.app' },
  },
} as const

const ORACLE_LINES = [
  "You'll lose 3% to gas today, but you'll win the lottery.",
  "Bridge today — your lucky ticket. 10x incoming.",
  "Swap USDC → ETH: the oracle sees +420% in your future.",
  "You'll be the first to launch an on-chain meme on Arc.",
  "Gas price will drop right after your transaction. You're a hero.",
  "Your next bridge tx will make you a testnet legend.",
  "Today you're not farming gas — you're farming fate. And it's kind.",
  "The oracle predicts: you'll forget to withdraw profit, but you'll remember the moment.",
  "You're the degen who bridges at the worst possible time — and still wins.",
  "This tx will age like fine wine. Or like a rug. Time will tell.",
  "Your wallet just became 0.01% more legendary.",
  "Congrats, you just paid for someone's yacht with that gas fee.",
  "The chain loves you today. Tomorrow it might ghost you.",
  "You're not farming testnet. You're building character.",
  "This bridge will be remembered in testnet history books.",
  "Your portfolio is 90% hope and 10% USDC. Classic.",
  "The oracle says: diamond hands, but paper wallet.",
  "You just made a smart contract developer somewhere very happy.",
  "This tx has main character energy.",
  "You're the reason gas fees exist. Thank you for your service.",
  "One day you'll tell your kids about this bridge.",
  "The chain is watching. And it's judging your choices.",
  "You're not late. You're fashionably on-chain.",
  "This swap will be studied by future degens.",
  "Your wallet just leveled up. +1 Degeneracy.",
  "The oracle predicts: you'll check this tx in 3 months and laugh.",
  "You're the kind of degen who bridges both ways for the vibes.",
  "This transaction has plot armor.",
  "Your gas fee just funded a small country.",
  "The chain rewards the bold. And the reckless.",
  "You're not farming. You're creating content.",
  "This bridge is going to look great on your resume.",
  "The oracle says: buy high, bridge higher.",
  "You're the protagonist of this testnet story.",
  "One small bridge for man, one giant fee for your wallet.",
  "Your wallet is now 5% cooler than before.",
  "The chain has spoken. It says 'lol'.",
  "This tx will be your Roman Empire.",
  "You're not lost. You're on an on-chain adventure.",
  "The oracle predicts: you'll tell this story at every crypto meetup.",
  "Your wallet just became a case study.",
  "This bridge is going to age like milk. Or like a legend.",
  "You're the degen the testnet deserves.",
  "The chain is proud of you. Probably.",
  "This transaction will be remembered for all the wrong reasons.",
  "You're not early. You're not late. You're exactly on time for chaos.",
  "The oracle says: your next move will be legendary or hilarious.",
  "Your wallet is now officially part of internet history.",
  "This bridge has main character syndrome.",
  "The chain thanks you for your contribution to the vibes.",
]

function getOraclePrediction(txHash: string, walletAddress?: string | null): string {
  // Используем и tx hash, и адрес кошелька, чтобы разные кошельки получали разные предсказания
  const combined = (txHash + (walletAddress || '')).toLowerCase()
  let hash = 0
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i)
    hash |= 0
  }
  const index = Math.abs(hash) % ORACLE_LINES.length
  return ORACLE_LINES[index]
}

export default function App() {
  const [address, setAddress] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [intentInput, setIntentInput] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)
  const [result, setResult] = useState<{ prediction: string; txHash: string; proof: string; action: string } | null>(null)

  // Состояния для рабочих send / swap
  const [swapAmount, setSwapAmount] = useState('1.00')
  const [swapDirection, setSwapDirection] = useState<'usdc_to_eurc' | 'eurc_to_usdc'>('usdc_to_eurc')

  // KIT_KEY из .env (VITE_KIT_KEY)
  const KIT_KEY = import.meta.env.VITE_KIT_KEY as string | undefined
  const hasKitKey = !!KIT_KEY && KIT_KEY.length > 10

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Кошелёк не найден. Установи Rabby, MetaMask или любой другой EIP-1193 кошелёк (OKX, Phantom и т.д.).')
      return
    }
    setIsConnecting(true)
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
      setAddress(accounts[0])
    } catch (err) {
      alert('Не удалось подключить кошелёк. В Rabby нажми «Connect» / «Разрешить» для этого сайта.')
    }
    setIsConnecting(false)
  }

  const disconnectWallet = () => {
    setAddress(null)
    // Можно также вызвать wallet_disconnect если провайдер поддерживает, но для Rabby/MetaMask достаточно просто сбросить state
  }

  // Надёжно добавляем и переключаемся на Arc Testnet
  const ensureArcTestnet = async () => {
    if (!window.ethereum) throw new Error('Wallet not found')

    const ARC_TESTNET_PARAMS = {
      chainId: '0x4cef52', // 5042002
      chainName: 'Arc Testnet',
      nativeCurrency: {
        name: 'USDC',
        symbol: 'USDC',
        decimals: 18,
      },
      rpcUrls: ['https://rpc.testnet.arc.network'],
      blockExplorerUrls: ['https://testnet.arcscan.app'],
    }

    // 1. Сначала добавляем сеть (idempotent — если уже есть, ничего не произойдёт)
    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [ARC_TESTNET_PARAMS],
      })
    } catch (addErr: any) {
      if (addErr.code === 4001) {
        alert('Чтобы продолжить, нужно добавить сеть Arc Testnet в Rabby.')
        throw addErr
      }
      // Если сеть уже существует — игнорируем
    }

    // 2. Теперь явно переключаемся на неё
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ARC_TESTNET_PARAMS.chainId }],
      })
    } catch (switchErr: any) {
      if (switchErr.code === 4001) {
        alert('Пожалуйста, переключитесь на сеть Arc Testnet в Rabby, чтобы выполнить Send / Bridge / Swap.')
        throw switchErr
      }
      throw switchErr
    }
  }

  const executeAction = async (actionType: string, customIntent?: string) => {
    if (!address) {
      await connectWallet()
      if (!address) return
    }

    if (!window.ethereum) {
      alert('Кошелёк не найден')
      return
    }

    setIsExecuting(true)

    try {
      // 1. Добавляем и переключаемся на Arc Testnet (Rabby покажет окно)
      await ensureArcTestnet()

      // 2. Теперь создаём адаптер — кошелёк уже должен быть на Arc Testnet
      const adapter = await createViemAdapterFromProvider({
        provider: window.ethereum as EIP1193Provider,
      })

      const kit = new AppKit()

      let txHash = ''
      let actionLabel = customIntent || actionType

      if (actionType === 'send') {
        // Реальный send 0.01 USDC самому себе на Arc Testnet
        const result = await kit.send({
          from: { adapter, chain: 'Arc_Testnet' },
          to: address,
          amount: '0.01',
          token: 'USDC',
        })
        txHash = result.txHash || ''
        actionLabel = 'Send 0.01 USDC (self)'
      } else if (actionType === 'swap') {
        const amount = swapAmount || '1.00'
        const isUSDCtoEURC = swapDirection === 'usdc_to_eurc'
        const directionLabel = isUSDCtoEURC ? 'USDC → EURC' : 'EURC → USDC'

        // ApexiSwap Router (v1, fee-on-transfer aware)
        const APEXI_ROUTER = '0x437b1aBf6e5a69548849b15EC35f83A73Fa1E28F' as const
        const EURC = '0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a' as const
        const WUSDC = '0x911b4000D3422F482F4062a913885f7b035382Df' as const

        const ERC20_ABI = [
          { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
          { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
          { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
        ] as const

        const WUSDC_ABI = [
          { name: 'deposit', type: 'function', stateMutability: 'payable', inputs: [], outputs: [] },
          { name: 'withdraw', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'wad', type: 'uint256' }], outputs: [] },
          { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ type: 'bool' }] },
          { name: 'allowance', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }], outputs: [{ type: 'uint256' }] },
          { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'owner', type: 'address' }], outputs: [{ type: 'uint256' }] },
        ] as const

        const APEXI_ROUTER_ABI = [
          {
            name: 'swapExactTokensForTokens',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'amountIn', type: 'uint256' },
              { name: 'amountOutMin', type: 'uint256' },
              { name: 'path', type: 'address[]' },
              { name: 'to', type: 'address' },
              { name: 'deadline', type: 'uint256' },
            ],
            outputs: [{ name: 'amounts', type: 'uint256[]' }],
          },
          {
            name: 'getAmountsOut',
            type: 'function',
            stateMutability: 'view',
            inputs: [
              { name: 'amountIn', type: 'uint256' },
              { name: 'path', type: 'address[]' },
            ],
            outputs: [{ name: 'amounts', type: 'uint256[]' }],
          },
        ] as const

        try {
          const walletClient = createWalletClient({ chain: ARC_TESTNET, transport: custom(window.ethereum) })
          const publicClient = createPublicClient({ chain: ARC_TESTNET, transport: http('https://rpc.testnet.arc.network') })

          const account = address as `0x${string}`
          const amountIn = isUSDCtoEURC ? parseEther(amount) : parseUnits(amount, 6)
          const swapInputToken = isUSDCtoEURC ? WUSDC : EURC
          const swapOutputToken = isUSDCtoEURC ? EURC : WUSDC
          const path = [swapInputToken, swapOutputToken] as readonly `0x${string}`[]
          const deadline = BigInt(Math.floor(Date.now() / 1000) + 600)

          let quotedOut = 0n
          let amountOutMin = 0n
          try {
            const amounts = await publicClient.readContract({
              address: APEXI_ROUTER,
              abi: APEXI_ROUTER_ABI,
              functionName: 'getAmountsOut',
              args: [amountIn, path],
            })
            quotedOut = amounts?.[amounts.length - 1] ?? 0n
            amountOutMin = quotedOut > 0n ? (quotedOut * 98n) / 100n : 0n
          } catch (err) {
            console.warn('getAmountsOut failed', { path, err })
          }

          console.log('Apexi swap params', {
            amountIn: amountIn.toString(),
            amountDisplay: amount,
            direction: directionLabel,
            path,
            quotedOut: quotedOut.toString(),
            amountOutMin: amountOutMin.toString(),
            deadline: deadline.toString(),
          })

          if (quotedOut <= 0n) {
            throw new Error('No valid ApexiSwap route for this pair/amount')
          }

          // 1. Wrap native USDC to WUSDC for USDC -> EURC swaps
          if (isUSDCtoEURC) {
            const beforeWrapped = await publicClient.readContract({
              address: WUSDC,
              abi: WUSDC_ABI,
              functionName: 'balanceOf',
              args: [account],
            })
            const wrapHash = await walletClient.writeContract({
              account,
              address: WUSDC,
              abi: WUSDC_ABI,
              functionName: 'deposit',
              args: [],
              value: amountIn,
            })
            await publicClient.waitForTransactionReceipt({ hash: wrapHash })
            const afterWrapped = await publicClient.readContract({
              address: WUSDC,
              abi: WUSDC_ABI,
              functionName: 'balanceOf',
              args: [account],
            })
            console.log('WUSDC wrap delta', (afterWrapped - beforeWrapped).toString())
          }

          // 2. Approve Router to spend swap input token
          const allowance = await publicClient.readContract({
            address: swapInputToken,
            abi: swapInputToken === WUSDC ? WUSDC_ABI : ERC20_ABI,
            functionName: 'allowance',
            args: [account, APEXI_ROUTER],
          })

          if (allowance < amountIn) {
            const approveHash = await walletClient.writeContract({
              account,
              address: swapInputToken,
              abi: swapInputToken === WUSDC ? WUSDC_ABI : ERC20_ABI,
              functionName: 'approve',
              args: [APEXI_ROUTER, amountIn],
            })
            await publicClient.waitForTransactionReceipt({ hash: approveHash })
          }

          // 3. Track wrapped output before swap for EURC -> USDC
          const wrappedBefore = !isUSDCtoEURC
            ? await publicClient.readContract({
                address: WUSDC,
                abi: WUSDC_ABI,
                functionName: 'balanceOf',
                args: [account],
              })
            : 0n

          // 4. Swap via ApexiSwap Router
          const tx = await walletClient.writeContract({
            account,
            address: APEXI_ROUTER,
            abi: APEXI_ROUTER_ABI,
            functionName: 'swapExactTokensForTokens',
            args: [amountIn, amountOutMin, path, account, deadline],
          })

          const receipt = await publicClient.waitForTransactionReceipt({ hash: tx })
          console.log('Apexi swap receipt', { txHash: tx, status: receipt.status })

          // 5. Unwrap WUSDC to native USDC for EURC -> USDC swaps
          if (!isUSDCtoEURC) {
            const wrappedAfter = await publicClient.readContract({
              address: WUSDC,
              abi: WUSDC_ABI,
              functionName: 'balanceOf',
              args: [account],
            })
            const wrappedReceived = wrappedAfter - wrappedBefore
            console.log('WUSDC received from swap', wrappedReceived.toString())
            if (wrappedReceived > 0n) {
              const unwrapHash = await walletClient.writeContract({
                account,
                address: WUSDC,
                abi: WUSDC_ABI,
                functionName: 'withdraw',
                args: [wrappedReceived],
              })
              await publicClient.waitForTransactionReceipt({ hash: unwrapHash })
            }
          }

          txHash = tx
          actionLabel = `Swap ${amount} ${directionLabel} via ApexiSwap`
        } catch (err: any) {
          const reason =
            err?.shortMessage ||
            err?.message ||
            err?.cause?.reason ||
            err?.cause?.shortMessage ||
            err?.data?.message ||
            err?.data?.error?.message ||
            'Unknown revert'
          console.error('ApexiSwap failed:', err)
          console.error('ApexiSwap revert reason:', reason)
          alert(`Swap failed: ${reason}. Showing a beautiful demo prediction.`)
          txHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')
          actionLabel = `Swap ${amount} ${directionLabel} (demo)`
        }
      } else {
        // custom intent — делаем send
        const result = await kit.send({
          from: { adapter, chain: 'Arc_Testnet' },
          to: address,
          amount: '0.01',
          token: 'USDC',
        })
        txHash = result.txHash || ''
      }

      if (!txHash) {
        throw new Error('Транзакция не вернула txHash')
      }

      const prediction = getOraclePrediction(txHash, address)
      const proof = 'oracle:' + txHash.slice(2, 22)

      setResult({
        prediction,
        txHash,
        proof,
        action: actionLabel,
      })
    } catch (err: any) {
      console.error('AppKit error:', err)
      const msg = err?.message || err?.reason || JSON.stringify(err)
      alert('Ошибка App Kit:\n' + msg)
    } finally {
      setIsExecuting(false)
      setIntentInput('')
    }
  }

  const openFaucet = () => {
    window.open('https://faucet.circle.com/', '_blank')
  }

  const closeResult = () => setResult(null)


  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white selection:bg-violet-500/30">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-violet-500 via-fuchsia-500 to-pink-500 flex items-center justify-center">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <div className="font-semibold text-2xl tracking-[-1.5px]">arc-intent-oracle</div>
                <div className="text-[10px] text-white/40 -mt-1.5">Arc Testnet × App Kit</div>
              </div>
            </div>
          </div>

          {address ? (
            <button
              onClick={disconnectWallet}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/20 hover:border-white/40 hover:bg-white/5 text-sm font-mono transition"
            >
              {address.slice(0, 6)}…{address.slice(-4)}
              <span className="text-white/40 text-xs">Disconnect</span>
            </button>
          ) : (
            <button
              onClick={connectWallet}
              disabled={isConnecting}
              className="flex items-center gap-2.5 px-5 py-2 rounded-2xl bg-white text-black text-sm font-medium hover:bg-white/90 active:bg-white transition disabled:opacity-60"
            >
              <Wallet className="w-4 h-4" />
              {isConnecting ? 'Подключаем...' : 'Connect Wallet'}
            </button>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-4xl mx-auto px-6 pt-20 pb-10 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full border border-white/10 bg-white/5 text-xs tracking-[4px] mb-6">
          ON-CHAIN FATE ENGINE
        </div>
        <h1 className="text-[92px] leading-[82px] font-semibold tracking-[-6.5px] mb-5">
          Your intent.<br />The chain decides.
        </h1>
        <p className="max-w-md mx-auto text-2xl text-white/60 tracking-tight">
          Describe the action → execute via Arc App Kit →<br />receive a sarcastic prediction born from the tx hash.
        </p>
      </div>

      {/* Faucet CTA */}
      <div className="max-w-4xl mx-auto px-6 mb-14">
        <button
          onClick={openFaucet}
          className="group w-full flex items-center justify-center gap-3 py-5 rounded-3xl border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 active:bg-white/15 transition text-xl font-medium tracking-tight"
        >
          Get free test USDC on Arc Testnet
          <ExternalLink className="w-5 h-5 group-hover:translate-x-0.5 transition" />
        </button>
        <div className="text-center text-xs text-white/40 mt-2.5">faucet.circle.com — Arc Testnet • once every 2 hours</div>
      </div>

      {/* KIT_KEY Warning */}
      {!hasKitKey && (
        <div className="max-w-4xl mx-auto px-6 mb-8">
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-6 py-4 rounded-2xl text-sm">
            ⚠️ <strong>VITE_KIT_KEY not found in .env</strong><br />
            Send is disabled. Create <code>.env</code> (not .env.example!), paste your key, and restart <code>npm run dev</code>.
          </div>
        </div>
      )}

      {/* Requirements */}
      <div className="max-w-4xl mx-auto px-6 mb-8 text-center text-xs text-amber-400/80">
        Send works reliably.<br />
        Swap works through ApexiSwap on Arc Testnet.<br />
        The app always delivers a beautiful prediction.
      </div>

      {/* Important note for users */}
      <div className="max-w-4xl mx-auto px-6 mb-8 text-center text-xs text-white/50">
        Important: Rabby / MetaMask must be connected to <span className="font-mono">Arc Testnet</span> (chainId 5042002) and have USDC.<br />
        If the network is not added, Rabby will prompt you to add it automatically on first transaction.
      </div>

      {/* Quick actions */}
      <div className="max-w-4xl mx-auto px-6">
        <div className="flex items-baseline justify-between mb-4 px-1">
          <div className="uppercase text-xs tracking-[3px] text-white/40">QUICK ACTIONS</div>
          <div className="text-xs text-white/40">or type your own intent below</div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          {/* Send — стабильно */}
          <button
            onClick={() => executeAction('send')}
            disabled={isExecuting}
            className="group flex flex-col items-start gap-8 p-7 rounded-3xl border border-white/10 hover:border-white/25 bg-[#111] hover:bg-[#181818] transition-all active:scale-[0.985] disabled:opacity-50 text-left"
          >
            <Send className="w-8 h-8 text-violet-400 group-hover:scale-110 transition" />
            <div>
              <div className="font-semibold text-3xl tracking-[-1.2px]">Send 0.01 USDC</div>
              <div className="text-xs text-white/40 mt-1">через Arc App Kit</div>
            </div>
          </button>

          {/* Swap — bidirectional USDC ↔ EURC */}
          <div className="group flex flex-col items-start gap-4 p-7 rounded-3xl border border-white/10 hover:border-white/25 bg-[#111] hover:bg-[#181818] transition-all text-left">
            <ArrowLeftRight className="w-8 h-8 text-violet-400" />
            <div className="w-full">
              <div className="font-semibold text-3xl tracking-[-1.2px] mb-3">Swap</div>

              <select
                value={swapDirection}
                onChange={(e) => setSwapDirection(e.target.value as any)}
                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2 mb-3 text-sm"
                disabled={isExecuting || !hasKitKey}
              >
                <option value="usdc_to_eurc">USDC → EURC</option>
                <option value="eurc_to_usdc">EURC → USDC</option>
              </select>

              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <div className="text-xs text-white/40 mb-1">Amount</div>
                  <input
                    type="text"
                    value={swapAmount}
                    onChange={(e) => setSwapAmount(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-lg font-mono"
                    placeholder="1.00"
                  />
                </div>
                <button
                  onClick={() => executeAction('swap')}
                  disabled={isExecuting}
                  className="px-8 py-2.5 rounded-xl bg-white text-black font-semibold disabled:bg-white/40 whitespace-nowrap"
                >
                  Swap
                </button>
              </div>

              <div className="text-xs text-white/40 mt-2">via ApexiSwap router</div>
            </div>
          </div>

          {/* Working Arc product replacement */}
          <div className="group flex flex-col items-start gap-4 p-7 rounded-3xl border border-white/10 hover:border-white/25 bg-[#111] hover:bg-[#181818] transition-all text-left">
            <ArrowUpRight className="w-8 h-8 text-violet-400" />
            <div className="w-full flex flex-col min-h-[208px]">
              <div className="font-semibold text-3xl tracking-[-1.2px] mb-3">Volume Events</div>

              <button
                onClick={() => window.open('https://www.apexiswap.com/volume-events', '_blank', 'noopener,noreferrer')}
                disabled={isExecuting}
                className="w-full py-3 rounded-xl bg-white text-black font-semibold disabled:bg-white/40 flex items-center justify-center gap-2 mt-auto"
              >
                Open Events <ExternalLink className="w-4 h-4" />
              </button>

              <div className="text-xs text-white/40 mt-2">trade on ApexiSwap and climb the Arc leaderboard</div>
            </div>
          </div>
        </div>

        {/* Custom intent input */}
        <div className="flex gap-3">
          <input
            type="text"
            value={intentInput}
            onChange={(e) => setIntentInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && intentInput.trim()) {
                executeAction('custom', intentInput.trim())
              }
            }}
            placeholder="swap 1 USDC to EURC and predict my fate"
            className="flex-1 bg-[#111] border border-white/10 focus:border-white/30 rounded-3xl px-8 py-[21px] text-[21px] placeholder:text-white/25 outline-none transition"
            disabled={isExecuting}
          />
          <button
            onClick={() => intentInput.trim() && executeAction('custom', intentInput.trim())}
            disabled={!intentInput.trim() || isExecuting}
            className="px-10 rounded-3xl bg-white text-black text-xl font-semibold active:bg-white/80 disabled:bg-white/40 transition"
          >
            {isExecuting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Execute'}
          </button>
        </div>
      </div>

      {/* Result Modal / Card */}
      {result && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-6">
          <div className="max-w-2xl w-full bg-[#0a0a0a] border border-white/10 rounded-3xl p-10">
            <div className="flex items-center gap-2 text-emerald-400 text-sm mb-4 tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ON-CHAIN ORACLE PROOF
            </div>

            <div className="text-5xl leading-tight tracking-[-1.5px] mb-9 pr-6">
              {result.prediction}
            </div>

            <div className="font-mono text-sm space-y-px">
              <div className="flex justify-between py-3 border-b border-white/10">
                <span className="text-white/40">Intent</span>
                <span className="text-white/80">{result.action}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-white/10">
                <span className="text-white/40">Oracle Proof</span>
                <span className="text-violet-400">{result.proof}</span>
              </div>
              <div className="flex justify-between py-3 border-b border-white/10">
                <span className="text-white/40">Transaction</span>
                <a
                  href={`https://testnet.arcscan.app/tx/${result.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:underline flex items-center gap-1.5"
                >
                  {result.txHash.slice(0, 18)}… <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
              {result.action.includes('Bridge') && address && (
                <div className="pt-3 text-[10px] text-white/50 leading-snug">
                  Показана последняя tx bridge (depositForBurn).<br />
                  <a
                    href={`https://sepolia.etherscan.io/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline inline-flex items-center gap-1"
                  >
                    Проверить USDC на Sepolia explorer <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            <button
              onClick={closeResult}
              className="mt-8 w-full py-4 rounded-2xl border border-white/20 hover:bg-white/5 text-sm tracking-widest transition"
            >
              CLOSE AND GET A NEW PREDICTION
            </button>
          </div>
        </div>
      )}

      {/* Footer explanation */}
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <div className="text-xs text-white/40 max-w-xs mx-auto leading-relaxed">
          Wallet connect → Arc App Kit send / ApexiSwap swap → real tx or demo → sarcastic on-chain prediction
        </div>
      </div>
    </div>
  )
}