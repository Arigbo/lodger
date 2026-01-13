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
            <AlertDialogContent className="w-[95vw] sm:w-full max-w-lg rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-10 border-none shadow-3xl bg-white/95 backdrop-blur-xl">
                <AlertDialogHeader className="space-y-4">
                    <AlertDialogTitle className="text-3xl font-black uppercase tracking-tight">
                        PROTOCOL <span className="text-destructive">TERMINATION.</span>
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-lg font-medium leading-relaxed font-sans text-muted-foreground/80">
                        Are you sure you want to deauthorize this session? You will be redirected to the secure authentication portal.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="pt-8 gap-4">
                    <AlertDialogCancel className="h-16 rounded-2xl font-black uppercase text-xs tracking-widest border-2 flex-1 shadow-lg shadow-black/[0.02] hover:bg-muted/50 transition-all">
                        Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="h-16 rounded-2xl font-black uppercase text-xs tracking-widest flex-1 bg-destructive hover:bg-destructive/90 text-white shadow-xl shadow-destructive/20 hover:shadow-destructive/40 hover:-translate-y-1 transition-all"
                    >
                        Log Out
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
