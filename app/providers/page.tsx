import {CoinbaseUserWallet} from '@/components/coinbase-user-wallet';
import {CryptoSetup} from '@/components/crypto-setup';
import {LinkConnection} from '@/components/link-connection';
export default function Providers(){return <main className="app-content"><div className="page-heading"><div><div className="eyebrow">THE RIGHT CONNECTIONS</div><h1>Your provider toolkit.</h1><p>Configure each provider once. Users can then set up their own accounts and wallets.</p></div><span className="badge neutral">Provider settings</span></div><CoinbaseUserWallet settings/><LinkConnection developerSettings/><CryptoSetup settings/></main>}
