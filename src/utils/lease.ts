
import { UserProfile, Property } from '@/types';
import { formatPrice } from './index';
import { format, addYears } from 'date-fns';

export interface LeaseData {
    landlord: UserProfile;
    tenant: UserProfile;
    property: Property;
    startDate?: string;
    endDate?: string;
}

export function generateLeaseText(template: string, data: LeaseData): string {
    const { landlord, tenant, property, startDate, endDate } = data;

    const leaseStartDate = startDate ? new Date(startDate) : new Date();
    const leaseEndDate = endDate ? new Date(endDate) : addYears(leaseStartDate, 1);

    const replacements: Record<string, string> = {
        '{{LANDLORD_NAME}}': landlord.legalName || landlord.name || '[Landlord Name]',
        '{{TENANT_NAME}}': tenant.legalName || tenant.name || '[Tenant Name]',
        '{{PROPERTY_ADDRESS}}': property.location.address || '[Address]',
        '{{PROPERTY_CITY}}': property.location.city || '[City]',
        '{{PROPERTY_STATE}}': property.location.state || '[State]',
        '{{PROPERTY_COUNTRY}}': property.location.country || '[Country]',
        '{{PROPERTY_ZIP}}': property.location.zip || '[ZIP]',
        '{{LEASE_START_DATE}}': format(leaseStartDate, 'MMMM do, yyyy'),
        '{{LEASE_END_DATE}}': format(leaseEndDate, 'MMMM do, yyyy'),
        '{{MONTHLY_RENT}}': formatPrice(property.price, property.currency),
        '{{SECURITY_DEPOSIT}}': formatPrice(property.price, property.currency),
        '{{AMENITIES}}': (property.amenities || []).join(', '),
        '{{RULES}}': (property.rules || []).join(', '),
        '{{DATE_TODAY}}': format(new Date(), 'MMMM do, yyyy'),
    };

    let result = template;
    Object.entries(replacements).forEach(([placeholder, value]) => {
        // Escape special regex characters if any were in placeholders, though {{}} are fine
        const regex = new RegExp(placeholder, 'g');
        result = result.replace(regex, value);
    });

    return result;
}
