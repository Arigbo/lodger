import { describe, expect, it } from 'vitest';
import { dashboardNav, getDashboardPageTitle, isNavItemActive } from './navigation';

describe('navigation', () => {
  it('matches the dashboard root only exactly', () => {
    const root = dashboardNav.student[0];
    expect(isNavItemActive(root, '/student')).toBe(true);
    expect(isNavItemActive(root, '/student/leases')).toBe(false);
  });

  it('matches nested routes', () => {
    const leases = dashboardNav.student.find((i) => i.href === '/student/leases')!;
    expect(isNavItemActive(leases, '/student/leases/123')).toBe(true);
    expect(isNavItemActive(leases, '/student/leasesx')).toBe(false);
  });

  it('derives page titles', () => {
    expect(getDashboardPageTitle('landlord', '/landlord/properties/1/edit')).toBe('Properties');
    expect(getDashboardPageTitle('student', '/student')).toBe('Home');
  });
});
