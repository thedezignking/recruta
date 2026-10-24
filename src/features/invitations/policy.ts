export const INVITATION_LIFETIME_MS = 72 * 60 * 60 * 1000;

export function invitationExpiresAt(now = new Date()) {
  return new Date(now.getTime() + INVITATION_LIFETIME_MS);
}

export function invitationIsAcceptable(input: {
  expiresAt: Date;
  acceptedAt?: Date | null;
  revokedAt?: Date | null;
  now?: Date;
}) {
  return (
    !input.acceptedAt &&
    !input.revokedAt &&
    input.expiresAt.getTime() > (input.now ?? new Date()).getTime()
  );
}
