import { Suspense } from 'react';
import { Wizard } from '@/components/wizard';
export default function Page(){return <Suspense fallback={<div className="empty-state">Preparing your setup…</div>}><Wizard/></Suspense>}
