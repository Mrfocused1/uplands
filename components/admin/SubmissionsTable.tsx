import Link from "next/link";

export interface SubmissionListItem {
  id: string;
  reference: string | null;
  fullName: string | null;
  companyName: string | null;
  siteName: string | null;
  declarationDate: string | null;
  printReviewStatus: string;
  createdAt: string;
  updatedAt: string;
  evidenceCount: number;
  evidenceTotal: number;
}

function statusBadge(status: string) {
  if (status === "ready") {
    return <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">Ready</span>;
  }
  return <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">Not reviewed</span>;
}

function date(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function SubmissionsTable({ submissions }: { submissions: SubmissionListItem[] }) {
  if (submissions.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
        <p className="font-semibold text-zinc-700">No inductions yet</p>
        <p className="mt-1 text-sm text-zinc-500">Completed inductions will appear here for review.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-baseline justify-between">
        <h1 className="text-2xl font-bold text-zinc-900">Inductions</h1>
        <span className="text-sm text-zinc-500">{submissions.length} total</span>
      </div>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Inductee</th>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Site</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Evidence</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {submissions.map((submission) => (
              <tr key={submission.id} className="transition hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <Link href={`/admin/submissions/${submission.id}`} className="font-semibold text-zinc-900 hover:underline">
                    {submission.fullName || "Unknown inductee"}
                  </Link>
                  <div className="text-xs text-zinc-400">{submission.reference}</div>
                </td>
                <td className="px-4 py-3 text-zinc-600">{submission.companyName || "—"}</td>
                <td className="px-4 py-3 text-zinc-600">{submission.siteName || "—"}</td>
                <td className="px-4 py-3 text-zinc-600">{date(submission.declarationDate)}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {submission.evidenceCount}/{submission.evidenceTotal}
                </td>
                <td className="px-4 py-3">{statusBadge(submission.printReviewStatus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
