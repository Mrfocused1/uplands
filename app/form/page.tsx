import { ProgressiveInduction } from "@/components/induction/ProgressiveInduction";

function safeReturnTo(value: string | undefined) {
  return value === "/admin/forms" ? value : undefined;
}

export default async function FormPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const params = await searchParams;
  return <ProgressiveInduction returnHref={safeReturnTo(params.returnTo)} />;
}
