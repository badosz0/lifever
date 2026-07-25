import type { ComponentPropsWithoutRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/cn";

type NoteMarkdownProps = {
  children: string;
  className?: string;
};

const ExternalLink = ({
  href,
  ...props
}: ComponentPropsWithoutRef<"a">) => (
  <a
    href={href}
    target={href?.startsWith("http") ? "_blank" : undefined}
    rel={href?.startsWith("http") ? "noreferrer" : undefined}
    {...props}
  />
);

export function NoteMarkdown({ children, className }: NoteMarkdownProps) {
  return (
    <div
      className={cn(
        "note-markdown text-[15px] leading-7 text-foreground",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ExternalLink,
          input: ({ className: inputClassName, ...props }) => (
            <input
              className={cn(
                "mr-2 size-3.5 translate-y-[1px] accent-primary",
                inputClassName,
              )}
              disabled
              {...props}
            />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
