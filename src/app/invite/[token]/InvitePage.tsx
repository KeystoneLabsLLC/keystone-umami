'use client';
import { Column, Loading, Text } from '@umami/react-zen';
import Link from 'next/link';
import { useApi, useMessages } from '@/components/hooks';
import { LogoLockup } from '@/components/svg';
import { SetPasswordForm } from './SetPasswordForm';

export function InvitePage({ token }: { token: string }) {
  const { t, labels, getMessage } = useMessages();
  const { get, useQuery } = useApi();

  const { data, isLoading } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => get('/invitations/verify', { token }),
    retry: false,
  });

  const frame = (children: React.ReactNode) => (
    <Column
      alignItems="center"
      justifyContent="flex-start"
      height="100vh"
      backgroundColor="surface-raised"
      style={{ paddingTop: '15vh' }}
    >
      <Column alignItems="center" gap="6">
        <LogoLockup style={{ width: 150, height: 'auto' }} />
        {children}
      </Column>
    </Column>
  );

  if (isLoading) {
    return <Loading placement="absolute" />;
  }

  if (!data?.valid) {
    return frame(
      <Column alignItems="center" gap="3" style={{ maxWidth: 320, textAlign: 'center' }}>
        <Text>{getMessage('invalid-invitation')}</Text>
        <Link href="/login">{t(labels.login)}</Link>
      </Column>,
    );
  }

  return frame(<SetPasswordForm token={token} email={data.email} teamName={data.teamName} />);
}
