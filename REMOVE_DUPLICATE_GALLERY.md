# Manual Fix Required: Remove Duplicate Gallery

## File
`src/app/student/properties/[id]/page.tsx`

## Lines to Delete
**Delete lines 458-470** (the standalone gallery section)

These lines contain:
```tsx
{/* Dedicated Media Gallery Section */}
<div className="space-y-8 pt-8 border-t border-border/50">
    <div>
        <h3 className="text-2xl font-black tracking-tight uppercase tracking-tighter">Property Gallery</h3>
        <p className="text-sm text-muted-foreground font-medium mt-1">Explore all photos and video walkthroughs of this property</p>
    </div>
    
    <PropertyGallery
        images={property.images}
        videos={property.videos}
        title={property.title}
    />
</div>
```

## Why
The gallery is now in the tabs section (first tab), so this standalone version creates a duplicate.

## After Deletion
The page flow will be: Hero → Back Button → Title → Specs → Tabs (Gallery, Overview, Amenities, Rules, Reviews)
