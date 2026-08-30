import { ProgressiveInduction } from "@/components/induction/ProgressiveInduction";

function safeReturnTo(value: string | undefined) {
  if (value === "/admin/forms") return value;
  if (value && /^\/admin\/sites\/[a-z0-9-]+\/forms$/.test(value)) return value;
  return undefined;
}

export default async function FormPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const params = await searchParams;
  return <ProgressiveInduction returnHref={safeReturnTo(params.returnTo)} />;
}
