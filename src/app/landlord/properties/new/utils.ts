import { FormValues } from './schemas';

export function generateLeaseTextForTemplate(propertyData: Partial<FormValues>): string {
    const amenitiesList = propertyData.amenities && propertyData.amenities.length > 0
        ? propertyData.amenities.join(', ')
        : 'None';

    const rulesList = propertyData.rules || 'None';
    const rentAmount = propertyData.price ? `${propertyData.currency} ${propertyData.price}` : '{{MONTHLY_RENT}}';
    return `LEASE AGREEMENT

This Lease Agreement (the "Agreement") is made and entered into on {{DATE_TODAY}}, by and between:

Landlord: Nill
Tenant: Nill

1. PROPERTY. Landlord agrees to lease to Tenant the property located at:
   ${propertyData.address || '{{PROPERTY_ADDRESS}}'}, ${propertyData.city || '{{PROPERTY_CITY}}'}, ${propertyData.state || '{{PROPERTY_STATE}}'}, ${propertyData.country || '{{PROPERTY_COUNTRY}}'}, ${propertyData.zip || '{{PROPERTY_ZIP}}'}

2. TERM. The lease term will begin on {{LEASE_START_DATE}} and will terminate on {{LEASE_END_DATE}}.

3. RENT. Tenant agrees to pay Landlord the sum of ${rentAmount} per month, due on the 1st day of each month.

4. SECURITY DEPOSIT. Upon execution of this Agreement, Tenant shall deposit with Landlord the sum of {{SECURITY_DEPOSIT}} as security for the faithful performance by Tenant of the terms hereof.

5. UTILITIES. Tenant is responsible for the payment of all utilities and services for the Property.

6. AMENITIES. The following amenities are included: ${amenitiesList}.

7. RULES. Tenant agrees to abide by the following rules: ${rulesList}.

8. SIGNATURES. By signing below, the parties agree to the terms and conditions of this Lease Agreement.

Landlord: Nill
Date: Nill

Tenant: Nill
Date: Nill`;
}
