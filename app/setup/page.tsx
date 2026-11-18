import {CoinbaseUserWallet} from '@/components/coinbase-user-wallet';
import {CryptoSetup} from '@/components/crypto-setup';
import {LinkConnection} from '@/components/link-connection';
export default function Setup(){return <main className="app-content"><div className="page-heading"><div><div className="eyebrow">WORKSPACE WALLETS</div><h1>Set up your wallets.</h1><p>Create your Coinbase wallet or connect Link, then attach the account to an agent.</p></div></div><CoinbaseUserWallet/><LinkConnection/><details className="panel docs-panel"><summary>Advanced: server-controlled wallets</summary><p>These wallets are controlled by Flux’s server, separately from your user-owned Coinbase wallet.</p><CryptoSetup/></details></main>}
