export type UserProfile = {
    id: string;
    name: string;
    email: string;
    profileImageUrl: string;
    role: 'landlord' | 'student';
    country?: string;
    state?: string;
    school?: string;
    city?: string;
    phone?: string;
    whatsappUrl?: string;
    twitterUrl?: string;
    bio?: string;
    legalName?: string;
    stripeAccountId?: string;
    currency?: string;
    bookmarkedPropertyIds?: string[];
    avatarType?: 'photo' | 'avatar' | 'character';
    avatarValue?: string;
};

export type User = UserProfile;
