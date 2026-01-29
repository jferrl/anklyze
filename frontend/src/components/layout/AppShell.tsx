import { Fragment, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '../ui/sidebar';
import { AppSidebar } from './AppSidebar';
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
  /** Translation key under 'breadcrumbs' namespace (e.g., 'classify', 'studies') */
  labelKey: string;
  href?: string;
}

interface AppShellProps {
  children: ReactNode;
  breadcrumbs?: BreadcrumbItemData[];
  title?: string;
}

export function AppShell({ children, breadcrumbs, title }: AppShellProps) {
  const { t } = useTranslation();
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Header with trigger and breadcrumbs */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {breadcrumbs && breadcrumbs.length > 0 && (
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((item, index) => (
                  <Fragment key={index}>
                    <BreadcrumbItem>
                      {index < breadcrumbs.length - 1 && item.href ? (
                        <BreadcrumbLink asChild>
                          <Link to={item.href}>{t(`breadcrumbs.${item.labelKey}`)}</Link>
                        </BreadcrumbLink>
                      ) : index < breadcrumbs.length - 1 ? (
                        <span className="text-muted-foreground">{t(`breadcrumbs.${item.labelKey}`)}</span>
                      ) : (
                        <BreadcrumbPage>{t(`breadcrumbs.${item.labelKey}`)}</BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                    {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                  </Fragment>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          )}
          {title && !breadcrumbs && (
            <h1 className="text-lg font-semibold">{title}</h1>
          )}
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
