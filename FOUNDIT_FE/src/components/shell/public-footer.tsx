export function PublicFooter() {
  return (
    <footer className="border-t border-[#dfe7e2] bg-[#eef5f0]">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 px-6 py-10 text-sm text-[#64748b] lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div>
          <p className="text-base font-semibold text-[#0f172a]">FoundIt</p>
          <p className="mt-1">Hire verified freelancers and manage projects in one workspace.</p>
        </div>
        <div className="flex flex-wrap gap-5">
          <a className="transition hover:text-[#0f172a]" href="/browse-freelancers">
            Browse Freelancers
          </a>
          <a className="transition hover:text-[#0f172a]" href="/browse-gigs">
            Browse Gigs
          </a>
          <a className="transition hover:text-[#0f172a]" href="/auth/sign-in">
            Login
          </a>
        </div>
      </div>
    </footer>
  );
}
