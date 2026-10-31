"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

export type ToolbarCrumb = {
  parent: { label: string; href: string };
  title: string;
};

const ToolbarTitleContext = createContext<(crumb: ToolbarCrumb | null) => void>(
  () => {},
);

export function ToolbarTitleProvider({
  children,
  setCrumb,
}: {
  children: ReactNode;
  setCrumb: (crumb: ToolbarCrumb | null) => void;
}) {
  return (
    <ToolbarTitleContext.Provider value={setCrumb}>
      {children}
    </ToolbarTitleContext.Provider>
  );
}

/** Shows "Parent › Title" in the desktop toolbar while a detail page is mounted. */
export function ToolbarBreadcrumb({
  parent,
  parentHref,
  title,
}: {
  parent: string;
  parentHref: string;
  title: string;
}) {
  const setCrumb = useContext(ToolbarTitleContext);
  useEffect(() => {
    setCrumb({ parent: { label: parent, href: parentHref }, title });
    return () => setCrumb(null);
  }, [setCrumb, parent, parentHref, title]);
  return null;
}

export function JobToolbarTitle({ title }: { title: string }) {
  return (
    <ToolbarBreadcrumb parent="Jobs" parentHref="/app/jobs" title={title} />
  );
}
