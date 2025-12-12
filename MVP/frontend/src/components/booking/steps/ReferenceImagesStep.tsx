import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import { uploadToCloudinary, getSignedUpload } from "@/lib/cloudinary";

type Props = {
  value: string[];
  onChange: (imageIds: string[]) => void;
};

export default function ReferenceImagesStep({ value, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const sig = await getSignedUpload("client_ref");
      const uploadPromises = Array.from(files).slice(0, 5).map(async (file) => {
        const result = await uploadToCloudinary(file, sig);
        return result.public_id;
      });

      const uploadedIds = await Promise.all(uploadPromises);
      const newIds = [...value, ...uploadedIds];
      onChange(newIds);
      
      const newPreviews = Array.from(files).slice(0, 5).map((file) =>
        URL.createObjectURL(file)
      );
      setPreviews([...previews, ...newPreviews]);
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = (index: number) => {
    const newIds = value.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    onChange(newIds);
    setPreviews(newPreviews);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Reference Images</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Upload reference images for your tattoo design (optional, up to 5 images)
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="reference-upload"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-accent transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG, GIF up to 10MB
                </p>
              </div>
              <input
                id="reference-upload"
                type="file"
                className="hidden"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading || value.length >= 5}
              />
            </label>
          </div>

          {previews.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {previews.map((preview, index) => (
                <div key={index} className="relative group">
                  <img
                    src={preview}
                    alt={`Reference ${index + 1}`}
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleRemove(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {uploading && (
            <p className="text-sm text-muted-foreground text-center">
              Uploading images...
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}

