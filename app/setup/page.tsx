import {CryptoSetup} from '@/components/crypto-setup';
import {LinkConnection} from '@/components/link-connection';
export default function Setup(){return <main className="app-content"><div className="page-heading"><div><div className="eyebrow">WORKSPACE WALLETS</div><h1>Set up your wallets.</h1><p>Connect Link or create a real testnet wallet. Attach accounts to agents separately.</p></div></div><LinkConnection/><CryptoSetup/></main>}
