import type { Session, User } from '@sme-financial-os/db';
import { prisma } from '@sme-financial-os/db';

export type Context = {
  prisma: typeof prisma;
  session: Session | null;
  user: User | null;
  organizationId: string | null;
};

export type AuthedContext = Context & {
  session: Session;
  user: User;
};

export type OrgContext = AuthedContext & {
  organizationId: string;
};

export async function createContext({
  sessionToken,
  organizationId,
}: {
  sessionToken?: string;
  organizationId?: string;
}): Promise<Context> {
  let session: Session | null = null;
  let user: User | null = null;

  if (sessionToken) {
    const sessionWithUser = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    if (sessionWithUser && sessionWithUser.expiresAt > new Date()) {
      session = sessionWithUser;
      user = sessionWithUser.user;
    }
  }

  return {
    prisma,
    session,
    user,
    organizationId: organizationId ?? null,
  };
}
