import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Building2,
  DollarSign,
  FileText,
  Heart,
  LayoutDashboard,
  MessageSquare,
  Search,
  UserCog,
  Users,
  Wrench,
} from 'lucide-react';
import { siteConfig } from './site';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** When true the item is only active on an exact path match. */
  exact?: boolean;
};

export type DashboardRole = 'student' | 'landlord';

export const marketingNav = [
  { href: '/properties', label: 'Browse homes' },
  { href: '/about', label: 'About' },
  { href: siteConfig.blogUrl, label: 'Blog', external: true },
  { href: '/auth/signup?type=landlord', label: 'List a property' },
] as const;

export const footerNav = [
  {
    title: 'Students',
    links: [
      { href: '/properties', label: 'Browse homes' },
      { href: '/#featured', label: 'Featured listings' },
      { href: '/auth/signup', label: 'Create an account' },
    ],
  },
  {
    title: 'Landlords',
    links: [
      { href: '/auth/signup?type=landlord', label: 'List a property' },
      { href: '/landlord', label: 'Landlord dashboard' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About us' },
      { href: siteConfig.blogUrl, label: 'Blog' },
      { href: `mailto:${siteConfig.supportEmail}`, label: 'Contact support' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/privacy', label: 'Privacy policy' },
      { href: '/terms', label: 'Terms of service' },
    ],
  },
] as const;

export const dashboardNav: Record<DashboardRole, NavItem[]> = {
  student: [
    { href: '/student', label: 'Dashboard', icon: LayoutDashboard, exact: true },
    { href: '/student/tenancy', label: 'My Tenancy', icon: Building2 },
    { href: '/student/properties', label: 'Find a Property', icon: Search },
    { href: '/student/bookmarks', label: 'Saved Homes', icon: Heart },
    { href: '/student/requests', label: 'My Requests', icon: Bell },
    { href: '/student/messages', label: 'Messages', icon: MessageSquare },
    { href: '/student/leases', label: 'Lease Agreements', icon: FileText },
    { href: '/student/account', label: 'Account', icon: UserCog },
  ],
  landlord: [
    { href: '/landlord', label: 'Overview', icon: LayoutDashboard, exact: true },
    { href: '/landlord/properties', label: 'Properties', icon: Building2 },
    { href: '/landlord/requests', label: 'Rental Requests', icon: Bell },
    { href: '/landlord/tenants', label: 'Tenants', icon: Users },
    { href: '/landlord/messages', label: 'Messages', icon: MessageSquare },
    { href: '/landlord/transactions', label: 'Transactions', icon: DollarSign },
    { href: '/landlord/maintenance', label: 'Maintenance', icon: Wrench },
    { href: '/landlord/leases', label: 'Lease Agreements', icon: FileText },
    { href: '/landlord/account', label: 'Account', icon: UserCog },
  ],
};

export function isNavItemActive(item: NavItem, pathname: string): boolean {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

/** Title shown in the browser tab for dashboard routes. */
export function getDashboardPageTitle(role: DashboardRole, pathname: string): string {
  const match = [...dashboardNav[role]]
    .sort((a, b) => b.href.length - a.href.length)
    .find((item) => isNavItemActive(item, pathname));
  if (pathname.includes('/notifications')) return 'Notifications';
  return match?.label ?? 'Dashboard';
}
