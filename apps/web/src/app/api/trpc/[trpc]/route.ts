import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/lib/trpc/root';
import { createTRPCContext } from '@/lib/trpc/context';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const handler = (request: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request,
    router: appRouter,
    createContext: createTRPCContext,
  });

export { handler as GET, handler as POST };
