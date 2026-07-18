import { Button, Dialog, DialogTrigger, Icon, Modal, Text, useToast } from '@umami/react-zen';
import { useMessages, useModified } from '@/components/hooks';
import { Plus } from '@/components/icons';
import { InviteUserForm } from './InviteUserForm';

export function InviteUserButton({ onSave }: { onSave?: () => void }) {
  const { t, labels } = useMessages();
  const { toast } = useToast();
  const { touch } = useModified();

  const handleSave = () => {
    toast(t(labels.invitationSent));
    touch('invitations');
    onSave?.();
  };

  return (
    <DialogTrigger>
      <Button data-test="button-invite-user">
        <Icon>
          <Plus />
        </Icon>
        <Text>{t(labels.inviteUser)}</Text>
      </Button>
      <Modal>
        <Dialog title={t(labels.inviteUser)} style={{ width: 400 }}>
          {({ close }) => <InviteUserForm onSave={handleSave} onClose={close} />}
        </Dialog>
      </Modal>
    </DialogTrigger>
  );
}
