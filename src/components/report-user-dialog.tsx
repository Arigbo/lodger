'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Flag, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

interface ReportUserDialogProps {
    isOpen: boolean;
    onClose: () => void;
    reportedUserId: string;
    reportedUserName: string;
}

export function ReportUserDialog({ isOpen, onClose, reportedUserId, reportedUserName }: ReportUserDialogProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const [reason, setReason] = useState<string>('');
    const [description, setDescription] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!reason) {
            toast({
                variant: 'destructive',
                description: 'Please select a reason for reporting.'
            });
            return;
        }
        if (!description || description.length < 10) {
            toast({
                variant: 'destructive',
                description: 'Please provide a description of at least 10 characters.'
            });
            return;
        }

        if (!user) {
            toast({
                variant: 'destructive',
                description: 'You must be logged in to report a user.'
            });
            return;
        }

        setIsSubmitting(true);
        try {
            await addDoc(collection(firestore, 'userReports'), {
                reporterId: user.uid,
                reportedUserId,
                reportedUserName, // Save name for easier admin viewing without join
                reason,
                description,
                status: 'pending',
                createdAt: serverTimestamp(),
            });

            toast({
                description: 'Report submitted successfully. We will investigate.'
            });
            onClose();
            setReason('');
            setDescription('');
        } catch (error) {
            console.error('Error submitting report:', error);
            toast({
                variant: 'destructive',
                description: 'Failed to submit report. Please try again.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[425px] rounded-2xl border-2 border-destructive/20">
                <DialogHeader>
                    <div className="flex items-center gap-3 text-destructive mb-2">
                        <div className="p-2 bg-destructive/10 rounded-full">
                            <Flag className="h-5 w-5" />
                        </div>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight">Report User</DialogTitle>
                    </div>
                    <DialogDescription>
                        You are reporting <span className="font-bold text-foreground">{reportedUserName}</span>. This action is serious and will be reviewed by our team.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="reason" className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">Reason</Label>
                        <Select onValueChange={setReason} value={reason}>
                            <SelectTrigger id="reason" className="h-12 rounded-xl bg-muted/20 border-transparent focus:ring-0 font-medium">
                                <SelectValue placeholder="Select a reason" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl font-medium">
                                <SelectItem value="spam">Spam or Scam</SelectItem>
                                <SelectItem value="harassment">Harassment or Bullying</SelectItem>
                                <SelectItem value="inappropriate">Inappropriate Content</SelectItem>
                                <SelectItem value="fake">Fake Account</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-xs font-black uppercase tracking-widest text-muted-foreground/80">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Please provide specific details..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="min-h-[120px] rounded-xl bg-muted/20 border-transparent focus-visible:ring-0 resize-none p-4 font-medium"
                        />
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting} className="rounded-xl font-bold">
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting} variant="destructive" className="rounded-xl font-bold uppercase tracking-widest shadow-lg shadow-destructive/20">
                        {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting...</> : 'Submit Report'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
