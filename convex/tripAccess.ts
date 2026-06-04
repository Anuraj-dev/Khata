import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

export type TripRole = "owner" | "viewer";

// Resolve who the caller is relative to a trip. The owner is always the member
// named "You"; anyone else gains read access only by claiming a member slot via
// an invite (tripMemberLinks). Returns null when the caller has no access.
export async function resolveTripAccess(
  ctx: QueryCtx | MutationCtx,
  tripId: Id<"trips">,
  caller: string
): Promise<{ trip: Doc<"trips">; role: TripRole; viewerMember: string } | null> {
  const trip = await ctx.db.get(tripId);
  if (!trip) return null;

  if (trip.ownerTokenIdentifier === caller) {
    return { trip, role: "owner", viewerMember: "You" };
  }

  const link = await ctx.db
    .query("tripMemberLinks")
    .withIndex("by_trip_viewer", (q) =>
      q.eq("tripId", tripId).eq("viewerTokenIdentifier", caller)
    )
    .unique();
  if (link) return { trip, role: "viewer", viewerMember: link.member };

  return null;
}
