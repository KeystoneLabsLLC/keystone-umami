'use client';
import { Button, Column, Loading, Row, Text, useToast } from '@umami/react-zen';
import { useApi, useMessages, useModified } from '@/components/hooks';

interface PendingInvitation {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  team?: { name: string } | null;
}

export function PendingInvitationsPanel() {
  const { t, labels } = useMessages();
  const { get, del, useQuery } = useApi();
  const { modified, touch } = useModified('invitations');
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['invitations', modified],
    queryFn: () => get('/invitations'),
  });

  const invitations: PendingInvitation[] = data?.data ?? [];

  const handleRevoke = async (id: string) => {
    await del(`/invitations/${id}`);
    touch('invitations');
    toast(t(labels.revoke));
  };

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Column gap="3">
      <Text weight="bold">{t(labels.pendingInvitations)}</Text>
      {invitations.length === 0 ? (
        <Text color="muted">{t(labels.noPendingInvitations)}</Text>
      ) : (
        <Column gap="2">
          {invitations.map(inv => (
            <Row
              key={inv.id}
              alignItems="center"
              justifyContent="space-between"
              gap="3"
              paddingY="2"
              style={{ borderBottom: '1px solid var(--border-color, #ecece4)' }}
            >
              <Column gap="1">
                <Text>{inv.email}</Text>
                <Text color="muted" size="xs">
                  {inv.role}
                  {inv.team?.name ? ` · ${inv.team.name}` : ''} · {t(labels.expires)}:{' '}
                  {new Date(inv.expiresAt).toLocaleDateString()}
                </Text>
              </Column>
              <Button variant="quiet" onPress={() => handleRevoke(inv.id)}>
                {t(labels.revoke)}
              </Button>
            </Row>
          ))}
        </Column>
      )}
    </Column>
  );
}
