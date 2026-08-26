"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

export interface SubmissionListItem {
  id: string;
  reference: string | null;
  fullName: string | null;
  companyName: string | null;
  siteName: string | null;
  declarationDate: string | null;
  printReviewStatus: string;
  pinned: boolean;
  isSample: boolean;
  searchText: string;
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
  const [items, setItems] = useState(submissions);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  const filtered = useMemo(() => {
    const terms = query
      .toLowerCase()
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (terms.length === 0) return items;

    return items.filter((submission) => {
      const haystack = [
        submission.reference,
        submission.fullName,
        submission.companyName,
        submission.siteName,
        submission.declarationDate,
        submission.printReviewStatus,
        submission.searchText,
        submission.isSample ? "sample" : "live",
        submission.pinned ? "pinned" : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return terms.every((term) => haystack.includes(term));
    });
  }, [items, query]);

  async function updatePinned(submission: SubmissionListItem) {
    setBusyId(submission.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pinned: !submission.pinned }),
      });

      if (!response.ok) throw new Error("Unable to update pin status.");

      setItems((current) =>
        current
          .map((item) => (item.id === submission.id ? { ...item, pinned: !submission.pinned } : item))
          .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.createdAt) - Date.parse(a.createdAt)),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update pin status.");
    } finally {
      setBusyId("");
    }
  }

  async function deleteRow(submission: SubmissionListItem) {
    if (!window.confirm(`Delete ${submission.fullName || submission.reference || "this induction"}?`)) return;

    setBusyId(submission.id);
    setError("");
    try {
      const response = await fetch(`/api/admin/submissions/${submission.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Unable to delete this induction.");
      setItems((current) => current.filter((item) => item.id !== submission.id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to delete this induction.");
    } finally {
      setBusyId("");
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white p-12 text-center">
        <p className="font-semibold text-zinc-700">No inductions yet</p>
        <p className="mt-1 text-sm text-zinc-500">Completed inductions will appear here for review.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Inductions</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {filtered.length} shown of {items.length} total
          </p>
        </div>
        <label className="w-full sm:max-w-sm">
          <span className="sr-only">Search inductions</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            type="search"
            placeholder="Search names, company, site, reference..."
            className="min-h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-uplands-magenta focus:ring-2 focus:ring-uplands-magenta/20"
          />
        </label>
      </div>

      {error && (
        <p className="mb-4 border-l-4 border-red-600 bg-white p-4 text-sm font-bold text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Pin</th>
              <th className="px-4 py-3 font-semibold">Inductee</th>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Site</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Evidence</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filtered.map((submission) => (
              <tr key={submission.id} className="transition hover:bg-zinc-50">
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => updatePinned(submission)}
                    disabled={busyId === submission.id}
                    className={`rounded-md border px-2.5 py-1 text-xs font-semibold disabled:opacity-60 ${
                      submission.pinned
                        ? "border-uplands-magenta bg-uplands-magenta text-white"
                        : "border-zinc-300 text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    {submission.pinned ? "Pinned" : "Pin"}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/submissions/${submission.id}`} className="font-semibold text-zinc-900 hover:underline">
                    {submission.fullName || "Unknown inductee"}
                  </Link>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <span>{submission.reference}</span>
                    {submission.isSample && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">Sample</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-zinc-600">{submission.companyName || "—"}</td>
                <td className="px-4 py-3 text-zinc-600">{submission.siteName || "—"}</td>
                <td className="px-4 py-3 text-zinc-600">{date(submission.declarationDate)}</td>
                <td className="px-4 py-3 text-zinc-600">
                  {submission.evidenceCount}/{submission.evidenceTotal}
                </td>
                <td className="px-4 py-3">{statusBadge(submission.printReviewStatus)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/admin/submissions/${submission.id}`}
                      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      View
                    </Link>
                    <Link
                      href={`/admin/submissions/${submission.id}/editor`}
                      className="rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                    >
                      Edit
                    </Link>
                    <a
                      href={`/api/admin/submissions/${submission.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-md bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-zinc-700"
                    >
                      Download
                    </a>
                    <button
                      type="button"
                      onClick={() => deleteRow(submission)}
                      disabled={busyId === submission.id}
                      className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-4 py-10 text-center text-sm text-zinc-500" colSpan={8}>
                  No inductions match that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
