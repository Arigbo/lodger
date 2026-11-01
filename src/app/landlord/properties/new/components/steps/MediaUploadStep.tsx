'use client';



import { motion } from 'framer-motion';
import { Utensils, Sofa, Bath, BedDouble, ImageIcon, Video } from 'lucide-react';
import { FileUpload } from '@/app/landlord/properties/new/components/file-upload';
import { VideoUpload } from '@/app/landlord/properties/new/components/video-upload';

interface MediaUploadStepProps {
    form: any;
    imageAnalysis: any;
    setImageAnalysis: (val: any) => void;
}

export const MediaUploadStep = ({ form, imageAnalysis, setImageAnalysis }: MediaUploadStepProps) => {
    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-10 md:space-y-14"
        >
            <div className="space-y-2">
                <h2 className="text-xl md:text-3xl font-bold tracking-tight text-foreground">
                    Photos & video
                </h2>
                <p className="text-xs md:text-xs font-bold text-muted-foreground/60 uppercase tracking-wider leading-relaxed">
                    Clear, well-lit photos of each room help your listing stand out.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-8">
                <FileUpload
                    icon={Utensils}
                    label="Kitchen"
                    description="Clear view of cooking area"
                    field={{
                        name: 'kitchenImage',
                        value: form.watch('kitchenImage'),
                        onChange: (val: any) => form.setValue('kitchenImage', val)
                    }}
                    onAnalysisChange={(analysis) => setImageAnalysis((prev: any) => ({ ...prev, kitchen: analysis }))}
                />
                <FileUpload
                    icon={Sofa}
                    label="Living Room"
                    description="Main relaxation space"
                    field={{
                        name: 'livingRoomImage',
                        value: form.watch('livingRoomImage'),
                        onChange: (val: any) => form.setValue('livingRoomImage', val)
                    }}
                    onAnalysisChange={(analysis) => setImageAnalysis((prev: any) => ({ ...prev, livingRoom: analysis }))}
                />
                <FileUpload
                    icon={BedDouble}
                    label="Bedroom"
                    description="Primary sleeping quarters"
                    field={{
                        name: 'bedroomImage',
                        value: form.watch('bedroomImage'),
                        onChange: (val: any) => form.setValue('bedroomImage', val)
                    }}
                    onAnalysisChange={(analysis) => setImageAnalysis((prev: any) => ({ ...prev, bedroom: analysis }))}
                />
                <FileUpload
                    icon={Bath}
                    label="Bathroom"
                    description="Sanitary facility view"
                    field={{
                        name: 'bathroomImage',
                        value: form.watch('bathroomImage'),
                        onChange: (val: any) => form.setValue('bathroomImage', val)
                    }}
                    onAnalysisChange={(analysis) => setImageAnalysis((prev: any) => ({ ...prev, bathroom: analysis }))}
                />
                <FileUpload
                    icon={ImageIcon}
                    label="Additional"
                    description="Any other key feature"
                    field={{
                        name: 'otherImage',
                        value: form.watch('otherImage'),
                        onChange: (val: any) => form.setValue('otherImage', val)
                    }}
                    onAnalysisChange={(analysis) => setImageAnalysis((prev: any) => ({ ...prev, other: analysis }))}
                />
                <VideoUpload
                    icon={Video}
                    label="Walkthrough"
                    description="Full property video tour"
                    field={{
                        name: 'propertyVideo',
                        value: form.watch('propertyVideo'),
                        onChange: (val: any) => form.setValue('propertyVideo', val)
                    }}
                />
            </div>
        </motion.div>
    );
};
