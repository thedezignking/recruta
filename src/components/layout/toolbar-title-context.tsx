"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

const ToolbarTitleContext = createContext<(title: string | null) => void>(
  () => {},
);

export function ToolbarTitleProvider({
  children,
  setTitle,
}: {
  children: ReactNode;
  setTitle: (title: string | null) => void;
}) {
  return (
    <ToolbarTitleContext.Provider value={setTitle}>
      {children}
    </ToolbarTitleContext.Provider>
  );
}

export function JobToolbarTitle({ title }: { title: string }) {
  const setTitle = useContext(ToolbarTitleContext);
  useEffect(() => {
    setTitle(title);
    return () => setTitle(null);
  }, [setTitle, title]);
  return null;
}
