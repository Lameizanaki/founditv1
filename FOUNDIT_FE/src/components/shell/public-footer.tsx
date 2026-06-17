export function PublicFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-slate-600 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-base font-semibold text-slate-900">FoundIt</p>
          <p className="mt-1">Hire verified freelancers and manage projects in one workspace.</p>
        </div>
        <div className="flex flex-wrap gap-5">
          <a className="transition hover:text-slate-900" href="/browse-freelancers">
            Browse Freelancers
          </a>
          <a className="transition hover:text-slate-900" href="/browse-gigs">
            Browse Gigs
          </a>
          <a className="transition hover:text-slate-900" href="/auth/sign-in">
            Login
          </a>
        </div>
      </div>
    </footer>
  );
}
