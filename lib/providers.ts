export type Provider = 'coinbase' | 'crossmint' | 'link';
export const PROVIDERS = {
 coinbase: {name:'Coinbase', label:'CDP API Key Wallet', kind:'Crypto wallet', description:'Server-controlled wallets, secured by Coinbase.', network:'Base Sepolia', environment:'Testnet', docs:'https://docs.cdp.coinbase.com/wallets/quickstart/api-key-auth', dashboard:'https://portal.cdp.coinbase.com', capabilities:['Create wallet','Read balance','Testnet funding'], requirements:'CDP API key ID, API key secret, and Wallet Secret. Accounts are controlled by your server.'},
 crossmint: {name:'Crossmint', label:'Server wallet', kind:'Crypto wallet', description:'Programmable wallets with server-side signers.', network:'Base Sepolia', environment:'Staging', docs:'https://github.com/Crossmint/wallets-server-quickstart', dashboard:'https://www.crossmint.com/console', capabilities:['Create wallet','Read balance','Testnet funding'], requirements:'Staging server API key plus separate 64-hex-character recovery and operational signer secrets. Your server controls both signers; no fabricated user identity is used.'},
 link: {name:'Stripe Link', label:'Linked payment account', kind:'Payment account', description:'Connect a human’s payment capability with Link.', network:'Not applicable', environment:'Production', docs:'https://docs.link.com/guides/add-payments-to-your-agent', dashboard:'https://link.com', capabilities:['User authorization','Payment account'], requirements:'Registered confidential OAuth client, Stripe publishable key, exact redirect URI, server session and encrypted token store. Configure the registered OAuth client on the server to enable live account connections.'}
} as const;
export const providerIds = Object.keys(PROVIDERS) as Provider[];
export function demoResult(agentId:string, provider:Provider) {
 let hash=0; for (const c of agentId+provider) hash=(hash*31+c.charCodeAt(0))>>>0;
 const hex=hash.toString(16).padStart(8,'0');
 return {provider, kind:provider==='link'?'linked_payment_account':'crypto_wallet', providerAccountId:`demo_${provider}_${agentId}`,address:provider==='link'?null:`0x${hex.repeat(5)}`,network:provider==='link'?null:'base-sepolia',environment:provider==='link'?'demo':provider==='crossmint'?'staging':'testnet',mode:'demo',status:'connected',balance:provider==='link'?'0.00':provider==='coinbase'?'125.00':'50.00'};
}
export function safeConfig(agent:{id:string;name:string;mode:string;wallets: Array<{provider:string;kind:string;providerAccountId:string;address:string|null;network:string|null;environment:string;status:string}>}) {
 return {schemaVersion:'1.0',agent:{id:agent.id,name:agent.name},mode:agent.mode,simulated:agent.mode==='demo',authorizesSpending:false,providers:agent.wallets.map(w=>({provider:w.provider,kind:w.kind,accountId:w.providerAccountId,address:w.address,network:w.network,environment:w.environment,status:w.status}))};
}
