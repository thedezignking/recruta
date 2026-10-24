import Link from "next/link";
import { BellIcon } from "@solar-icons/react/linear";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { RecrutaLogo } from "@/components/shared/recruta-mark";

export function PortalShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/portal">
            <RecrutaLogo />
          </Link>
          <nav
            aria-label="Client portal"
            className="hidden items-center gap-6 text-sm sm:flex"
          >
            <Link href="/portal" className="font-medium text-primary">
              Overview
            </Link>
            <Link
              href="/portal/requests"
              className="text-muted-foreground hover:text-foreground"
            >
              Requests
            </Link>
            <Link
              href="/portal/jobs"
              className="text-muted-foreground hover:text-foreground"
            >
              Jobs
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <BellIcon aria-hidden="true" size={19} />
            </Button>
            <Avatar size="sm">
              <AvatarFallback className="bg-primary/10 text-primary">
                NO
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>
      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-9"
      >
        {children}
      </main>
    </div>
  );
}
