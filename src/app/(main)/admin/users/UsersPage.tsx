'use client';
import { Column, Row } from '@umami/react-zen';
import { PageHeader } from '@/components/common/PageHeader';
import { Panel } from '@/components/common/Panel';
import { useMessages } from '@/components/hooks';
import { InviteUserButton } from './InviteUserButton';
import { PendingInvitationsPanel } from './PendingInvitationsPanel';
import { UserAddButton } from './UserAddButton';
import { UsersDataTable } from './UsersDataTable';

export function UsersPage() {
  const { t, labels } = useMessages();

  const handleSave = () => {};

  return (
    <Column gap="6" margin="2">
      <PageHeader title={t(labels.users)}>
        <Row gap="3">
          <InviteUserButton onSave={handleSave} />
          <UserAddButton onSave={handleSave} />
        </Row>
      </PageHeader>
      <Panel>
        <UsersDataTable />
      </Panel>
      <Panel>
        <PendingInvitationsPanel />
      </Panel>
    </Column>
  );
}
