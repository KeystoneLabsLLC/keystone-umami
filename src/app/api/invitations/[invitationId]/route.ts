import { parseRequest } from '@/lib/request';
import { json, notFound, unauthorized } from '@/lib/response';
import { canCreateUser } from '@/permissions';
import { deleteInvitation, getInvitation } from '@/queries/prisma';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> },
) {
  const { invitationId } = await params;

  const { auth, error } = await parseRequest(request);

  if (error) {
    return error();
  }

  if (!(await canCreateUser(auth))) {
    return unauthorized();
  }

  const invitation = await getInvitation(invitationId);

  if (!invitation) {
    return notFound();
  }

  await deleteInvitation(invitationId);

  return json({ ok: true });
}
