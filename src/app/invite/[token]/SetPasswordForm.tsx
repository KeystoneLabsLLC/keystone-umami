'use client';
import {
  Column,
  Form,
  FormButtons,
  FormField,
  FormSubmitButton,
  PasswordField,
  Text,
  TextField,
} from '@umami/react-zen';
import { useRouter } from 'next/navigation';
import { useMessages, useUpdateQuery } from '@/components/hooks';
import { setClientAuthToken } from '@/lib/client';
import { setUser } from '@/store/app';

export function SetPasswordForm({
  token,
  email,
  teamName,
}: {
  token: string;
  email: string;
  teamName?: string;
}) {
  const { t, labels, messages, getErrorMessage } = useMessages();
  const router = useRouter();
  const { mutateAsync, error } = useUpdateQuery('/invitations/accept');

  const handleSubmit = async (data: any) => {
    await mutateAsync(
      { ...data, token },
      {
        onSuccess: async ({ token: authToken, user }) => {
          setClientAuthToken(authToken);
          setUser(user);
          router.push('/');
        },
      },
    );
  };

  return (
    <Column alignItems="center" gap="3">
      <Text weight="bold" size="lg">
        {t(labels.setPassword)}
      </Text>
      <Text color="muted">{email}</Text>
      {teamName && (
        <Text color="muted" size="sm">
          {t(labels.team)}: {teamName}
        </Text>
      )}
      <Form onSubmit={handleSubmit} error={getErrorMessage(error)} style={{ minWidth: 300 }}>
        <FormField
          label={t(labels.username)}
          name="username"
          rules={{ required: t(labels.required) }}
        >
          <TextField autoComplete="username" />
        </FormField>

        <FormField label={t(labels.displayName)} name="displayName">
          <TextField autoComplete="name" />
        </FormField>

        <FormField
          label={t(labels.password)}
          name="password"
          rules={{
            required: t(labels.required),
            minLength: { value: 8, message: t(messages.minPasswordLength, { n: '8' }) },
          }}
        >
          <PasswordField autoComplete="new-password" />
        </FormField>

        <FormButtons>
          <FormSubmitButton variant="primary" style={{ flex: 1 }} isDisabled={false}>
            {t(labels.createAccount)}
          </FormSubmitButton>
        </FormButtons>
      </Form>
    </Column>
  );
}
