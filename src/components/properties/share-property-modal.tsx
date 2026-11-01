'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, Copy, Share2, Twitter, Facebook, Linkedin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SharePropertyModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId: string;
    propertyTitle: string;
}

export function SharePropertyModal({ isOpen, onClose, propertyId, propertyTitle }: SharePropertyModalProps) {
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    // Construct the public URL for the property
    // Assuming the public URL structure. Update base URL as needed.
    const propertyUrl = typeof window !== 'undefined'
        ? `${window.location.origin}/properties/${propertyId}`
        : `/properties/${propertyId}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(propertyUrl);
        setCopied(true);
        toast({
            description: "Link copied to clipboard!",
        });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = (platform: 'twitter' | 'facebook' | 'linkedin') => {
        let shareUrl = '';
        const text = `Check out this amazing property: ${propertyTitle}`;

        switch (platform) {
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(propertyUrl)}`;
                break;
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(propertyUrl)}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(propertyUrl)}`;
                break;
        }

        window.open(shareUrl, '_blank', 'width=600,height=400');
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md w-[95vw] rounded-[2rem] p-0 overflow-hidden border-2 border-primary/20">
                <div className="bg-primary/5 p-8 text-center space-y-4">
                    <div className="mx-auto bg-white p-4 rounded-full w-20 h-20 flex items-center justify-center shadow-xl mb-4 animate-in zoom-in duration-500">
                        <Share2 className="h-10 w-10 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight">Property Deployed!</DialogTitle>
                    <DialogDescription className="text-base font-medium">
                        "<span className="uppercase">{propertyTitle}</span>" has been successfully published. Share it now to attract tenants.
                    </DialogDescription>
                </div>

                <div className="p-8 space-y-6 bg-white">
                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">Property Link</p>
                        <div className="flex gap-2">
                            <Input
                                value={propertyUrl}
                                readOnly
                                className="h-12 rounded-xl bg-muted/20 border-2 border-transparent font-medium text-xs"
                            />
                            <Button
                                onClick={handleCopy}
                                className="h-12 w-12 rounded-xl shrink-0"
                                variant="outline"
                            >
                                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 text-center">Or share via</p>
                        <div className="flex justify-center gap-4">
                            <Button variant="outline" size="icon" className="rounded-full h-12 w-12 hover:bg-[#1DA1F2] hover:text-white hover:border-[#1DA1F2] transition-colors" onClick={() => handleShare('twitter')}>
                                <Twitter className="h-5 w-5" />
                            </Button>
                            <Button variant="outline" size="icon" className="rounded-full h-12 w-12 hover:bg-[#4267B2] hover:text-white hover:border-[#4267B2] transition-colors" onClick={() => handleShare('facebook')}>
                                <Facebook className="h-5 w-5" />
                            </Button>
                            <Button variant="outline" size="icon" className="rounded-full h-12 w-12 hover:bg-[#0077b5] hover:text-white hover:border-[#0077b5] transition-colors" onClick={() => handleShare('linkedin')}>
                                <Linkedin className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>
                </div>
                <DialogFooter className="bg-muted/10 p-6 flex justify-center sm:justify-center">
                    <Button onClick={onClose} variant="ghost" className="font-black uppercase tracking-widest text-xs">
                        Close & View Property
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
