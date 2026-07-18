import type { Metadata } from 'next';
import { InvitePage } from './InvitePage';

export const dynamic = 'force-dynamic';

export default async function ({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  return <InvitePage token={token} />;
}

export const metadata: Metadata = {
  title: 'Accept Invitation',
};
