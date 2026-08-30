import Link from "next/link";

import { ProgressiveInduction } from "@/components/induction/ProgressiveInduction";
import { InductionHeader } from "@/components/induction/InductionHeader";
import { getPublicInductionInvitation } from "@/lib/db/inductionInvitations";

export const metadata = {
  title: "Invited Induction | Uplands",
};

export default async function InvitedInductionPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invitation = await getPublicInductionInvitation(token);

  if (!invitation) {
    return (
      <div className="min-h-screen bg-uplands-paper">
        <InductionHeader />
        <main className="mx-auto max-w-3xl px-5 py-14 sm:px-8">
          <section className="border border-zinc-200 bg-white p-6 shadow-soft">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-uplands-magenta">Induction Invite</p>
            <h1 className="mt-3 font-slab text-4xl leading-tight text-uplands-charcoal">This Invite Link Is Not Available</h1>
            <p className="mt-4 text-base leading-7 text-uplands-muted">
              The invite may have expired, been revoked, or already been used. Contact the site manager for a new induction invite.
            </p>
            <Link
              href="/"
              className="mt-6 inline-flex min-h-11 items-center border border-zinc-300 px-4 text-sm font-bold uppercase text-zinc-700 hover:border-uplands-magenta hover:text-uplands-magenta"
            >
              Uplands Home
            </Link>
          </section>
        </main>
      </div>
    );
  }

  return (
    <ProgressiveInduction
      invite={{
        token: invitation.token,
        siteName: invitation.siteName,
        companyName: invitation.contractorName,
        fullName: invitation.fullName,
        contactNumber: invitation.phone,
        occupation: invitation.role,
      }}
    />
  );
}
