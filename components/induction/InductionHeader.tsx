import Image from "next/image";
import { documentMetadata } from "@/config/uhsf1601Schema";
import { projectConfig } from "@/config/projectConfig";

export function InductionHeader() {
  return (
    <header className="no-print border-b border-zinc-200 bg-white">
      <div className="mx-auto flex min-h-24 w-full max-w-6xl items-center justify-between gap-5 px-5 py-5 sm:px-8">
        <div className="flex items-center gap-4">
          <Image src={projectConfig.logoPath} alt="Uplands Construction" width={235} height={44} priority className="h-auto w-44 sm:w-56" />
        </div>
        <div className="text-right">
          <p className="font-din text-xs uppercase tracking-normal text-uplands-magenta">{documentMetadata.code}</p>
          <h1 className="mt-1 font-slab text-lg leading-tight text-uplands-charcoal sm:text-2xl">
            Site Induction
            <span className="block">Registration Form</span>
          </h1>
        </div>
      </div>
    </header>
  );
}
