// @ts-nocheck
import { generateLeaseText, LeaseData } from './lease';
import { UserProfile, Property } from '@/types';

describe('generateLeaseText', () => {
    const landlord: Partial<UserProfile> = {
        name: 'John Landlord',
        legalName: 'John A. Landlord',
    };

    const tenant: Partial<UserProfile> = {
        name: 'Jane Student',
    };

    const property: Partial<Property> = {
        id: 'prop123',
        title: 'Luxury Apartment',
        price: 1500,
        currency: 'USD',
        location: {
            address: '123 Main St',
            city: 'London',
            state: 'Greater London',
            country: 'UK',
            zip: 'SW1A 1AA',
        },
        amenities: ['Wifi', 'Kitchen'],
        rules: ['No smoking'],
    };

    const data: LeaseData = {
        landlord: landlord as UserProfile,
        tenant: tenant as UserProfile,
        property: property as Property,
    };

    it('replaces all placeholders correctly', () => {
        const template = 'Agreement between {{LANDLORD_NAME}} and {{TENANT_NAME}} for {{PROPERTY_ADDRESS}} at {{MONTHLY_RENT}} per month.';
        const result = generateLeaseText(template, data);

        expect(result).toContain('John A. Landlord');
        expect(result).toContain('Jane Student');
        expect(result).toContain('123 Main St');
        expect(result).toContain('$1,500');
    });

    it('uses fallbacks for missing legal name', () => {
        const dataNoLegal = { ...data, landlord: { ...landlord, legalName: undefined } as UserProfile };
        const template = 'Landlord: {{LANDLORD_NAME}}';
        const result = generateLeaseText(template, dataNoLegal);
        expect(result).toContain('John Landlord');
    });
});
