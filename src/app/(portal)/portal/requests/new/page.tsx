import { DocumentAddIcon } from "@solar-icons/react/linear";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/shared/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/page-header";

export default function NewRequestPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="New hiring request" />
      <Card className="mt-6 shadow-none">
        <CardHeader className="border-b pb-4">
          <CardTitle>Role details</CardTitle>
        </CardHeader>
        <CardContent>
          <form>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="title">Role title</FieldLabel>
                <Input
                  id="title"
                  required
                  placeholder="e.g. Senior Backend Engineer"
                />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="department">Department</FieldLabel>
                  <Input id="department" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="positions">
                    Number of positions
                  </FieldLabel>
                  <Input
                    id="positions"
                    type="number"
                    min="1"
                    defaultValue="1"
                  />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="location">Location</FieldLabel>
                  <Input id="location" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="arrangement">
                    Work arrangement
                  </FieldLabel>
                  <select
                    id="arrangement"
                    className="h-9 rounded-lg border bg-background px-3 text-sm"
                  >
                    <option>On-site</option>
                    <option>Hybrid</option>
                    <option>Remote</option>
                  </select>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="brief">Role brief</FieldLabel>
                <Textarea
                  id="brief"
                  className="min-h-32"
                  placeholder="What will this person own, and what outcomes matter?"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="requirements">Requirements</FieldLabel>
                <Textarea
                  id="requirements"
                  className="min-h-28"
                  placeholder="Add each essential qualification or experience."
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="attachments">
                  Supporting documents
                </FieldLabel>
                <label
                  htmlFor="attachments"
                  className="flex cursor-pointer flex-col items-center rounded-lg border border-dashed p-6 text-center hover:border-primary/50 hover:bg-primary/[.025]"
                >
                  <DocumentAddIcon
                    aria-hidden="true"
                    size={24}
                    className="text-primary"
                  />
                  <span className="mt-2 text-sm font-medium">
                    Choose PDF or DOCX files
                  </span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    Up to 5 files, 10 MiB each
                  </span>
                </label>
                <Input
                  id="attachments"
                  type="file"
                  multiple
                  accept=".pdf,.docx"
                  className="sr-only"
                />
                <FieldDescription>
                  Files are private and shared only with authorized agency
                  members.
                </FieldDescription>
              </Field>
              <div className="flex flex-wrap justify-end gap-2">
                <ButtonLink variant="outline" href="/portal/requests">
                  Cancel
                </ButtonLink>
                <Button variant="outline" type="button">
                  Save draft
                </Button>
                <Button type="submit">Submit request</Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
