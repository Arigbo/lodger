import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Building2,
  FileText,
  Heart,
  Inbox,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Search,
  Send,
  Settings,
  Users,
  Wallet,
  Wrench,
} from 'lucide-react';
import { siteConfig } from './site';

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** When true the item is only active on an exact path match. */
  exact?: boolean;
  /** Key used to attach a live count badge (see useNavBadges). */
  badge?: 'requests' | 'maintenance' | 'notifications';
};

export type NavGroup = { label: string; items: NavItem[] };

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

/** Sidebar navigation, grouped by what the user is trying to do. */
export const dashboardNavGroups: Record<DashboardRole, NavGroup[]> = {
  student: [
    { label: 'Overview', items: [{ href: '/student', label: 'Home', icon: LayoutDashboard, exact: true }] },
    {
      label: 'Find a home',
      items: [
        { href: '/student/properties', label: 'Browse homes', icon: Search },
        { href: '/student/bookmarks', label: 'Saved homes', icon: Heart },
        { href: '/student/requests', label: 'My requests', icon: Send },
      ],
    },
    {
      label: 'My home',
      items: [
        { href: '/student/tenancy', label: 'Tenancy', icon: Building2 },
        { href: '/student/leases', label: 'Leases', icon: FileText },
        { href: '/student/messages', label: 'Messages', icon: MessageSquare },
      ],
    },
    {
      label: 'Account',
      items: [
        { href: '/student/notifications', label: 'Notifications', icon: Bell, badge: 'notifications' },
        { href: '/student/account', label: 'Settings', icon: Settings },
      ],
    },
  ],
  landlord: [
    { label: 'Overview', items: [{ href: '/landlord', label: 'Home', icon: LayoutDashboard, exact: true }] },
    {
      label: 'Listings',
      items: [
        { href: '/landlord/properties', label: 'Properties', icon: Building2 },
        { href: '/landlord/requests', label: 'Requests', icon: Inbox, badge: 'requests' },
      ],
    },
    {
      label: 'Tenants',
      items: [
        { href: '/landlord/tenants', label: 'Tenants', icon: Users },
        { href: '/landlord/leases', label: 'Leases', icon: FileText },
        { href: '/landlord/maintenance', label: 'Maintenance', icon: Wrench, badge: 'maintenance' },
        { href: '/landlord/messages', label: 'Messages', icon: MessageSquare },
      ],
    },
    { label: 'Money', items: [{ href: '/landlord/transactions', label: 'Transactions', icon: Wallet }] },
    {
      label: 'Account',
      items: [
        { href: '/landlord/notifications', label: 'Notifications', icon: Bell, badge: 'notifications' },
        { href: '/landlord/account', label: 'Settings', icon: Settings },
      ],
    },
  ],
};

/** Flat list (used for page titles, breadcrumbs and the command menu). */
export const dashboardNav: Record<DashboardRole, NavItem[]> = {
  student: dashboardNavGroups.student.flatMap((g) => g.items),
  landlord: dashboardNavGroups.landlord.flatMap((g) => g.items),
};

/** The four destinations shown in the mobile bottom bar (plus "More"). */
export const mobileTabs: Record<DashboardRole, string[]> = {
  student: ['/student', '/student/properties', '/student/requests', '/student/messages'],
  landlord: ['/landlord', '/landlord/properties', '/landlord/requests', '/landlord/messages'],
};

/** The main call to action shown in the top bar. */
export const primaryAction: Record<DashboardRole, { href: string; label: string; icon: LucideIcon }> = {
  student: { href: '/student/properties', label: 'Find a home', icon: Search },
  landlord: { href: '/landlord/properties/new', label: 'Add property', icon: Plus },
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
  return match?.label ?? 'Home';
}
