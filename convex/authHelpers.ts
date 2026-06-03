import type { QueryCtx, MutationCtx } from "./_generated/server";

export async function requireTokenIdentifier(ctx: QueryCtx | MutationCtx): Promise<string> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity.tokenIdentifier;
}
