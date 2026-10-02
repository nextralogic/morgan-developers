import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import type { MouseEvent } from "react";
import { useTranslation } from "react-i18next";

interface PropertyPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  getPageHref: (page: number) => string;
}

/** Build the list of page numbers to display (with ellipsis gaps). */
function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("ellipsis");

  pages.push(total);
  return pages;
}

const PropertyPagination = ({ page, totalPages, onPageChange, getPageHref }: PropertyPaginationProps) => {
  const { t } = useTranslation("common");
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  // Real hrefs keep every page crawlable; clicks stay client-side.
  const linkProps = (target: number) => ({
    href: getPageHref(target),
    onClick: (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      onPageChange(target);
    },
  });

  return (
    <Pagination className="mt-10" aria-label={t("pagination.ariaLabel")}>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            {...(page > 1 ? linkProps(page - 1) : { "aria-disabled": true })}
            className={page <= 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            label={t("pagination.previous")}
            ariaLabel={t("pagination.previousAria")}
          />
        </PaginationItem>

        {pages.map((p, idx) =>
          p === "ellipsis" ? (
            <PaginationItem key={`ellipsis-${idx}`}>
              <PaginationEllipsis label={t("pagination.morePages")} />
            </PaginationItem>
          ) : (
            <PaginationItem key={p}>
              <PaginationLink
                isActive={p === page}
                {...linkProps(p)}
                className="cursor-pointer"
              >
                {p}
              </PaginationLink>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          <PaginationNext
            {...(page < totalPages ? linkProps(page + 1) : { "aria-disabled": true })}
            className={page >= totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            label={t("pagination.next")}
            ariaLabel={t("pagination.nextAria")}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
};

export default PropertyPagination;
