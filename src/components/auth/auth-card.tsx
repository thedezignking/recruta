import Link from "next/link";
import { RecrutaLogo } from "@/components/shared/recruta-mark";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="app-grid flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-7 flex justify-center">
          <RecrutaLogo />
        </Link>
        <Card className="shadow-[0_24px_70px_rgba(23,24,43,.09)]">
          <CardHeader className="border-b pb-5 text-center">
            <h1 className="font-heading text-xl font-medium tracking-[-.025em]">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            )}
          </CardHeader>
          <CardContent>{children}</CardContent>
          {footer && (
            <div className="border-t bg-muted/35 px-5 py-4 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
