import { AgentDetail } from '@/components/agent-detail';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;return <AgentDetail id={id}/>}
