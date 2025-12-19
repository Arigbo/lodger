"use client";

import React, { useEffect, useState, useRef } from 'react';

interface StatCardProps {
    label: string;
    value: number;
    suffix: string;
}

export function StatCard({ label, value, suffix }: StatCardProps) {
    const [count, setCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible) return;

        let start = 0;
        const end = value;
        const duration = 2000;
        const increment = end / (duration / 16);

        const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
                setCount(end);
                clearInterval(timer);
            } else {
                setCount(Math.floor(start));
            }
        }, 16);

        return () => clearInterval(timer);
    }, [isVisible, value]);

    return (
        <div ref={cardRef} className="text-center group">
            <div className="text-4xl md:text-6xl font-extrabold text-foreground mb-4 group-hover:text-primary transition-colors duration-300">
                {count.toLocaleString()}{suffix}
            </div>
            <div className="text-sm font-black text-muted-foreground uppercase tracking-[0.3em]">
                {label}
            </div>
        </div>
    );
}
