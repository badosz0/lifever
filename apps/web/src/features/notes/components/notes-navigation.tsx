import { ChevronDown, Pin, Tags } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { noteCategoryFilter } from "@/features/notes/lib/notes";
import { useNotes } from "@/features/notes/model/notes-provider";
import { cn } from "@/lib/cn";

export function NotesNavigation() {
  const { activeFilter, categories, setActiveFilter } = useNotes();

  return (
    <nav
      className="-mx-1 flex min-w-0 items-center gap-0.5 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label="Note collections"
    >
      <button
        type="button"
        onClick={() => setActiveFilter("all")}
        className={cn(
          "relative flex h-8 shrink-0 items-center rounded-md px-2 text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
          activeFilter === "all"
            ? "text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
        aria-current={activeFilter === "all" ? "page" : undefined}
      >
        All
        <span
          className={cn(
            "absolute right-2 bottom-0 left-2 h-0.5 rounded-full bg-primary transition-opacity duration-150",
            activeFilter === "all" ? "opacity-100" : "opacity-0",
          )}
          aria-hidden="true"
        />
      </button>
      <button
        type="button"
        onClick={() => setActiveFilter("pinned")}
        className={cn(
          "relative flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
          activeFilter === "pinned"
            ? "text-foreground"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
        aria-current={activeFilter === "pinned" ? "page" : undefined}
      >
        <Pin className="size-3" fill="currentColor" />
        Pinned
        <span
          className={cn(
            "absolute right-2 bottom-0 left-2 h-0.5 rounded-full bg-primary transition-opacity duration-150",
            activeFilter === "pinned" ? "opacity-100" : "opacity-0",
          )}
          aria-hidden="true"
        />
      </button>
      <span
        className="mx-1 hidden h-4 w-px shrink-0 bg-border/75 sm:block"
        aria-hidden="true"
      />
      <div className="hidden items-center gap-0.5 sm:flex">
        {categories.map((category) => {
          const filter = noteCategoryFilter(category.id);
          const selected = activeFilter === filter;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={cn(
                "relative flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2 text-[13px] font-medium outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
              aria-current={selected ? "page" : undefined}
            >
              <span
                className="size-2 rounded-full"
                style={{ backgroundColor: category.color }}
                aria-hidden="true"
              />
              {category.name}
              <span
                className={cn(
                  "absolute right-2 bottom-0 left-2 h-0.5 rounded-full transition-opacity duration-150",
                  selected ? "opacity-100" : "opacity-0",
                )}
                style={{ backgroundColor: category.color }}
                aria-hidden="true"
              />
            </button>
          );
        })}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-8 min-w-0 items-center gap-1 rounded-md px-2 text-[12px] font-medium text-muted-foreground outline-none transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring sm:hidden",
              activeFilter.startsWith("category:") && "text-foreground",
            )}
            aria-label="Choose note category"
          >
            <Tags className="size-3.5 shrink-0" />
            <span className="max-w-[68px] truncate">
              {activeFilter.startsWith("category:")
                ? categories.find(
                    (category) =>
                      noteCategoryFilter(category.id) === activeFilter,
                  )?.name ?? "Categories"
                : "Categories"}
            </span>
            <ChevronDown className="size-3 shrink-0" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-44">
          {categories.map((category) => {
            const filter = noteCategoryFilter(category.id);
            return (
              <DropdownMenuItem
                key={category.id}
                onSelect={() => setActiveFilter(filter)}
              >
                <span
                  className="size-2.5 rounded-full"
                  style={{ backgroundColor: category.color }}
                  aria-hidden="true"
                />
                <span className="flex-1 truncate">{category.name}</span>
                {activeFilter === filter ? (
                  <span className="text-[10px] text-muted-foreground">✓</span>
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
