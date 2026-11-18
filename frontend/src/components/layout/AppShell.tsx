import { Fragment, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '../ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { RecordTitleContext } from './recordTitle';
import { Separator } from '../ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../ui/breadcrumb';

interface BreadcrumbItemData {
  /** Translation key under 'breadcrumbs'; omitted for the record crumb. */
  labelKey?: string;
  /** Marks the crumb that shows the current case or study title, set by the page with useRecordTitle. */
  record?: boolean;
  /** Link target; relative paths resolve against the URL, e.g. '../edit'. */
  href?: string;
}

interface AppShellProps {
  children: ReactNode;
  breadcrumbs?: BreadcrumbItemData[];
  title?: string;
}

export function AppShell({ children, breadcrumbs, title }: AppShellProps) {
  const { t } = useTranslation();
  const [recordTitle, setRecordTitle] = useState<string>();
  const label = (item: BreadcrumbItemData) =>
    item.record ? recordTitle ?? '…' : t(`breadcrumbs.${item.labelKey}`);

  return (
    <SidebarProvider>
      <a
        href="#content"
        className="sr-only rounded-sm border bg-background text-sm font-medium text-foreground outline-none focus-visible:not-sr-only focus-visible:fixed focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:px-3 focus-visible:py-2 focus-visible:ring-[3px] focus-visible:ring-ring"
      >
        {t('common.skipToContent')}
      </a>
      <AppSidebar />
      <SidebarInset>
        <header className="sticky top-0 z-20 flex h-12 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          {breadcrumbs && breadcrumbs.length > 0 && (
            <>
              <Separator orientation="vertical" className="mr-2 h-4" />
              <Breadcrumb className="min-w-0">
                <BreadcrumbList className="flex-nowrap">
                  {breadcrumbs.map((item, index) => {
                    const last = index === breadcrumbs.length - 1;
                    return (
                      <Fragment key={item.labelKey ?? 'record'}>
                        <BreadcrumbItem className="min-w-0">
                          {last ? (
                            <BreadcrumbPage className="block max-w-[28ch] truncate">{label(item)}</BreadcrumbPage>
                          ) : item.href ? (
                            <BreadcrumbLink asChild>
                              <Link to={item.href} relative="path" className="block max-w-[28ch] truncate">
                                {label(item)}
                              </Link>
                            </BreadcrumbLink>
                          ) : (
                            <span className="block max-w-[28ch] truncate text-muted-foreground">{label(item)}</span>
                          )}
                        </BreadcrumbItem>
                        {!last && <BreadcrumbSeparator />}
                      </Fragment>
                    );
                  })}
                </BreadcrumbList>
              </Breadcrumb>
            </>
          )}
          {title && !breadcrumbs && <h1 className="text-lg font-semibold">{title}</h1>}
        </header>

        <RecordTitleContext.Provider value={setRecordTitle}>
          <main id="content" tabIndex={-1} className="min-w-0 flex-1 outline-none">{children}</main>
        </RecordTitleContext.Provider>
      </SidebarInset>
    </SidebarProvider>
  );
}
