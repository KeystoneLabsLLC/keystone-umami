import {
  Button,
  Form,
  FormButtons,
  FormField,
  FormSubmitButton,
  ListItem,
  Select,
  TextField,
} from '@umami/react-zen';
import { useApi, useMessages, useUpdateQuery } from '@/components/hooks';

// Sentinel for "don't share a team" in the optional team Select.
const NO_TEAM = 'none';

// Single access level for the invite. The server derives both the account role
// and the team role from this one choice.
const INVITE_ROLES = ['view-only', 'member', 'manager'] as const;

export function InviteUserForm({
  onSave,
  onClose,
}: {
  onSave?: (data?: any) => void;
  onClose?: () => void;
}) {
  const { mutateAsync, error, isPending } = useUpdateQuery('/invitations');
  const { t, labels, getErrorMessage } = useMessages();
  const { get, useQuery } = useApi();

  const { data: teamsResult } = useQuery({
    queryKey: ['invite:teams'],
    queryFn: () => get('/admin/teams', { pageSize: 200 }),
  });
  const teams: { id: string; name: string }[] = teamsResult?.data ?? [];

  const roleLabel: Record<(typeof INVITE_ROLES)[number], string> = {
    'view-only': t(labels.viewOnly),
    member: t(labels.member),
    manager: t(labels.manager),
  };

  const handleSubmit = async (data: any) => {
    const payload: Record<string, any> = { email: data.email, role: data.role };

    if (data.teamId && data.teamId !== NO_TEAM) {
      payload.teamId = data.teamId;
    }

    await mutateAsync(payload, {
      onSuccess: async () => {
        onSave?.(data);
        onClose?.();
      },
    });
  };

  return (
    <Form onSubmit={handleSubmit} error={getErrorMessage(error)}>
      <FormField label={t(labels.email)} name="email" rules={{ required: t(labels.required) }}>
        <TextField type="email" autoComplete="off" data-test="input-email" />
      </FormField>

      <FormField label={t(labels.role)} name="role" rules={{ required: t(labels.required) }}>
        <Select defaultSelectedKey="view-only">
          {INVITE_ROLES.map(role => (
            <ListItem key={role} id={role}>
              {roleLabel[role]}
            </ListItem>
          ))}
        </Select>
      </FormField>

      <FormField label={t(labels.shareTeam)} name="teamId">
        <Select defaultSelectedKey={NO_TEAM}>
          <ListItem id={NO_TEAM}>—</ListItem>
          {teams.map(team => (
            <ListItem key={team.id} id={team.id}>
              {team.name}
            </ListItem>
          ))}
        </Select>
      </FormField>

      <FormButtons>
        <Button isDisabled={isPending} onPress={onClose}>
          {t(labels.cancel)}
        </Button>
        <FormSubmitButton variant="primary" data-test="button-submit" isDisabled={false}>
          {t(labels.sendInvitation)}
        </FormSubmitButton>
      </FormButtons>
    </Form>
  );
}
