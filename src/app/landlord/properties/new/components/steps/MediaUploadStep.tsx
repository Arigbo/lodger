'use client';



import { motion } from 'framer-motion';
import { Utensils, Sofa, Bath, BedDouble, ImageIcon, Video } from 'lucide-react';
import { FileUpload } from '@/app/landlord/properties/new/components/file-upload';
import { VideoUpload } from '@/app/landlord/properties/new/components/video-upload';
import type { PropertyForm, SetImageAnalysis } from "../../types";
import type { MediaSlotKey, SavedMedia } from "@/lib/property-drafts";

interface MediaUploadStepProps {
    form: PropertyForm;
    setImageAnalysis: SetImageAnalysis;
    /** Photos already uploaded with a saved draft. */
    savedMedia?: SavedMedia;
    onRemoveSaved?: (key: MediaSlotKey) => void;
}

export const MediaUploadStep = ({ form, setImageAnalysis, savedMedia = {}, onRemoveSaved }: MediaUploadStepProps) => {
    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-8"
        >
            <div className="space-y-2">
                <h2 className="font-headline text-xl font-bold tracking-tight sm:text-2xl">
                    Photos & video
                </h2>
                <p className="text-sm text-muted-foreground">
                    Clear, well-lit photos of each room help your listing stand out.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-8">
                <FileUpload
                    icon={Utensils}
                    label="Kitchen"
                    description="Clear view of cooking area"
                    existingUrl={savedMedia.kitchen}
                    onRemoveExisting={onRemoveSaved ? () => onRemoveSaved('kitchen') : undefined}
                    field={{
                        name: 'kitchenImage',
                        value: form.watch('kitchenImage'),
                        onChange: (val: FileList | null) => form.setValue('kitchenImage', val)
                    }}
                    onAnalysisChange={(analysis) => setImageAnalysis((prev) => ({ ...prev, kitchen: analysis }))}
                />
                <FileUpload
                    icon={Sofa}
                    label="Living Room"
                    description="Main relaxation space"
                    existingUrl={savedMedia.livingRoom}
                    onRemoveExisting={onRemoveSaved ? () => onRemoveSaved('livingRoom') : undefined}
                    field={{
                        name: 'livingRoomImage',
                        value: form.watch('livingRoomImage'),
                        onChange: (val: FileList | null) => form.setValue('livingRoomImage', val)
                    }}
                    onAnalysisChange={(analysis) => setImageAnalysis((prev) => ({ ...prev, livingRoom: analysis }))}
                />
                <FileUpload
                    icon={BedDouble}
                    label="Bedroom"
                    description="Primary sleeping quarters"
                    existingUrl={savedMedia.bedroom}
                    onRemoveExisting={onRemoveSaved ? () => onRemoveSaved('bedroom') : undefined}
                    field={{
                        name: 'bedroomImage',
                        value: form.watch('bedroomImage'),
                        onChange: (val: FileList | null) => form.setValue('bedroomImage', val)
                    }}
                    onAnalysisChange={(analysis) => setImageAnalysis((prev) => ({ ...prev, bedroom: analysis }))}
                />
                <FileUpload
                    icon={Bath}
                    label="Bathroom"
                    description="Sanitary facility view"
                    existingUrl={savedMedia.bathroom}
                    onRemoveExisting={onRemoveSaved ? () => onRemoveSaved('bathroom') : undefined}
                    field={{
                        name: 'bathroomImage',
                        value: form.watch('bathroomImage'),
                        onChange: (val: FileList | null) => form.setValue('bathroomImage', val)
                    }}
                    onAnalysisChange={(analysis) => setImageAnalysis((prev) => ({ ...prev, bathroom: analysis }))}
                />
                <FileUpload
                    icon={ImageIcon}
                    label="Additional"
                    description="Any other key feature"
                    existingUrl={savedMedia.other}
                    onRemoveExisting={onRemoveSaved ? () => onRemoveSaved('other') : undefined}
                    field={{
                        name: 'otherImage',
                        value: form.watch('otherImage'),
                        onChange: (val: FileList | null) => form.setValue('otherImage', val)
                    }}
                    onAnalysisChange={(analysis) => setImageAnalysis((prev) => ({ ...prev, other: analysis }))}
                />
                {savedMedia.video && !form.watch('propertyVideo')?.[0] && (
                    <p className="flex items-center justify-between gap-3 rounded-xl border bg-muted/40 px-4 py-3 text-sm md:col-span-2">
                        <span>A video tour is saved in this draft. Choose a new file below to replace it.</span>
                        {onRemoveSaved && (
                            <button type="button" className="text-muted-foreground hover:text-destructive" onClick={() => onRemoveSaved('video')}>
                                Remove
                            </button>
                        )}
                    </p>
                )}
                <VideoUpload
                    icon={Video}
                    label="Walkthrough"
                    description="Full property video tour"
                    field={{
                        name: 'propertyVideo',
                        value: form.watch('propertyVideo'),
                        onChange: (val: FileList | null) => form.setValue('propertyVideo', val)
                    }}
                />
            </div>
        </motion.div>
    );
};
