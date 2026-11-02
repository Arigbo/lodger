'use client';

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface LogoutModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
}

export function LogoutModal({ open, onOpenChange, onConfirm }: LogoutModalProps) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className="w-[95vw] max-w-md rounded-2xl p-6 sm:p-8">
                <AlertDialogHeader className="space-y-2">
                    <AlertDialogTitle className="text-2xl font-bold tracking-tight">
                        Log out of Lodger?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-base text-muted-foreground">
                        You will need to sign in again to view your dashboard, messages and leases.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3 pt-4">
                    <AlertDialogCancel className="h-11 flex-1 rounded-xl font-semibold">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="h-11 flex-1 rounded-xl bg-destructive font-semibold text-destructive-foreground hover:bg-destructive/90"
                    >
                        Log Out
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
