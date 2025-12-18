'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, Phone, MessageSquare } from "lucide-react";

export function SupportBubble() {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button
                    size="icon"
                    className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl z-[100] hover:scale-110 active:scale-95 transition-transform duration-200"
                    aria-label="Contact Support"
                >
                    <HelpCircle className="h-7 w-7" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">How can we help?</DialogTitle>
                    <DialogDescription>
                        Reach out to us through any of our support channels below.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Button
                        variant="outline"
                        className="h-16 justify-start gap-4 text-lg font-semibold bg-green-50 border-green-200 hover:bg-green-100 dark:bg-green-900/10 dark:border-green-800"
                        asChild
                    >
                        <a href="https://wa.me/2348109432202" target="_blank" rel="noopener noreferrer">
                            <MessageSquare className="h-6 w-6 text-green-600" />
                            Whatsapp: 08109432202
                        </a>
                    </Button>
                    <Button
                        variant="outline"
                        className="h-16 justify-start gap-4 text-lg font-semibold bg-blue-50 border-blue-200 hover:bg-blue-100 dark:bg-blue-900/10 dark:border-blue-800"
                        asChild
                    >
                        <a href="tel:08109432202">
                            <Phone className="h-6 w-6 text-blue-600" />
                            Phone: 08109432202
                        </a>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
