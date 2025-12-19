'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { cn } from '@/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFirestore } from '@/firebase';
import { collection, query, getDocs, addDoc, orderBy, startAt, endAt, limit } from 'firebase/firestore';
import { useToast } from "@/hooks/use-toast";
import { Combobox as BaseCombobox } from "@/components/ui/combobox";
import { countries } from '@/types/countries';

const getStates = (countryName: string) => {
    return countries.find(c => c.name === countryName)?.states || [];
};

interface School {
    id: string;
    value: string; // This will hold the school name for display/saving
    label: string;
}

interface SchoolComboboxProps {
    value?: string;
    onChange: (value: string) => void;
    placeholder?: string;
    emptyText?: string;
    className?: string;
    disabled?: boolean;
}

export function SchoolCombobox({
    value,
    onChange,
    placeholder = 'Select university...',
    emptyText = 'School not found.',
    className,
    disabled = false,
}: SchoolComboboxProps) {
    const [open, setOpen] = React.useState(false);
    const [schools, setSchools] = React.useState<School[]>([]);
    const [searchValue, setSearchValue] = React.useState('');
    const [loading, setLoading] = React.useState(false);
    const firestore = useFirestore();
    const { toast } = useToast();

    // Add School Dialog State
    const [isAddDialogOpen, setIsAddDialogOpen] = React.useState(false);
    const [newSchoolName, setNewSchoolName] = React.useState('');
    const [newSchoolCity, setNewSchoolCity] = React.useState('');
    const [newSchoolCountry, setNewSchoolCountry] = React.useState('');
    const [newSchoolState, setNewSchoolState] = React.useState('');
    const [isAdding, setIsAdding] = React.useState(false);

    // Initial load & Search
    React.useEffect(() => {
        if (!firestore) return;

        const fetchSchools = async () => {
            setLoading(true);
            try {
                const schoolsRef = collection(firestore, 'schools');
                let q;

                if (searchValue.trim()) {
                    // Simple prefix search (case-sensitive in Firestore, usually needs a standardized field for better search)
                    // For MVP, we'll just search by name
                    q = query(
                        schoolsRef,
                        orderBy('name'),
                        startAt(searchValue),
                        endAt(searchValue + '\uf8ff'),
                        limit(20)
                    );
                } else {
                    q = query(schoolsRef, orderBy('name'), limit(20));
                }

                const snapshot = await getDocs(q);
                const fetchedSchools: School[] = snapshot.docs.map(doc => ({
                    id: doc.id,
                    value: doc.data().name, // We use name as the value for now
                    label: doc.data().name
                }));
                setSchools(fetchedSchools);
            } catch (error) {
                console.error("Error fetching schools:", error);
            } finally {
                setLoading(false);
            }
        };

        const timer = setTimeout(() => {
            fetchSchools();
        }, 300); // Debounce

        return () => clearTimeout(timer);
    }, [searchValue, firestore]);

    const handleAddSchool = async () => {
        if (!newSchoolName || !newSchoolCountry || !newSchoolCity) {
            toast({
                variant: 'destructive',
                title: 'Missing Fields',
                description: 'Please fill in Name, City, and Country.'
            });
            return;
        }

        if (!firestore) {
            toast({
                variant: 'destructive',
                title: 'System Error',
                description: 'Database connection not available.'
            });
            return;
        }

        setIsAdding(true);
        try {
            const schoolsRef = collection(firestore, 'schools');
            await addDoc(schoolsRef, {
                name: newSchoolName,
                city: newSchoolCity,
                country: newSchoolCountry,
                state: newSchoolState || null,
                createdAt: new Date().toISOString()
            });

            // Select the new school
            onChange(newSchoolName);
            setSearchValue(''); // Reset search
            setIsAddDialogOpen(false);
            // Reset Form
            setNewSchoolName('');
            setNewSchoolCity('');
            setNewSchoolState('');
            setNewSchoolCountry('');

            toast({
                title: 'School Added',
                description: `${newSchoolName} has been added to our database.`
            });

        } catch (error) {
            console.error("Error adding school:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Failed to add school. Please try again.'
            });
        } finally {
            setIsAdding(false);
        }
    };

    const availableStates = React.useMemo(() => {
        if (!newSchoolCountry) return [];
        return getStates(newSchoolCountry).map(s => s.name);
    }, [newSchoolCountry]);

    return (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <Popover open={open} onOpenChange={setOpen} modal={false}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className={cn("w-full justify-between", className, !value && "text-muted-foreground")}
                        disabled={disabled}
                    >
                        {value
                            ? value // Since we store the name directly as value
                            : placeholder}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-[--radix-popover-trigger-width] p-0 z-[300]"
                    onOpenAutoFocus={(e) => e.preventDefault()}
                >
                    <Command shouldFilter={false}>
                        {/* Disable local filtering because we do server-side search */}
                        <CommandInput
                            placeholder="Search university..."
                            value={searchValue}
                            onValueChange={setSearchValue}
                        />
                        <CommandList>
                            <CommandEmpty className="p-2">
                                <p className="text-sm text-muted-foreground mb-2">{emptyText}</p>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="w-full text-xs h-7"
                                    onClick={() => {
                                        setNewSchoolName(searchValue); // Pre-fill name
                                        setOpen(false);
                                        setIsAddDialogOpen(true);
                                    }}
                                >
                                    <Plus className="mr-1 h-3 w-3" /> Add "{searchValue || 'New School'}"
                                </Button>
                            </CommandEmpty>
                            <CommandGroup>
                                {schools.map((school) => (
                                    <CommandItem
                                        key={school.id}
                                        value={school.label}
                                        onPointerDown={(e) => {
                                            e.preventDefault();
                                        }}
                                        onSelect={(currentValue) => {
                                            onChange(currentValue === value ? "" : currentValue);
                                            setOpen(false);
                                        }}
                                        onClick={() => {
                                            onChange(school.label === value ? "" : school.label);
                                            setOpen(false);
                                        }}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === school.value ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {school.label}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <DialogContent className="sm:max-w-md w-[95vw] border-2 shadow-lg">
                <DialogHeader>
                    <DialogTitle>Add New School</DialogTitle>
                    <DialogDescription>
                        Can't find your university? Add it to our database.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">University Name</Label>
                        <Input
                            id="name"
                            value={newSchoolName}
                            onChange={(e) => setNewSchoolName(e.target.value)}
                            placeholder="e.g. University of Example"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Country</Label>
                            <BaseCombobox
                                options={countries.map(c => ({ label: c.name, value: c.name }))}
                                value={newSchoolCountry}
                                onChange={setNewSchoolCountry}
                                placeholder="Select Country"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>State / Province</Label>
                            <BaseCombobox
                                options={availableStates.map(state => ({ label: state, value: state }))}
                                value={newSchoolState}
                                onChange={setNewSchoolState}
                                placeholder="Select State"
                                disabled={!newSchoolCountry || availableStates.length === 0}
                            />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="city">City</Label>
                        <Input
                            id="city"
                            value={newSchoolCity}
                            onChange={(e) => setNewSchoolCity(e.target.value)}
                            placeholder="e.g. London"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isAdding}>Cancel</Button>
                    <Button onClick={handleAddSchool} disabled={isAdding}>
                        {isAdding ? "Adding..." : "Add School"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
