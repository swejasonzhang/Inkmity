import FormInput from "@/components/dashboard/FormInput";

type ArtistProfile = {
    location: string;
    shop: string;
    years: string;
    baseRate: string;
    instagram: string;
    portfolio: string;
};

export default function ArtistDetailsStep({
    artist, onChange,
}: {
    artist: ArtistProfile;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
    return (
        <div className="grid gap-4">
            <FormInput type="text" name="location" value={artist.location} placeholder="Your city / region"
                onChange={onChange} isValid={!!artist.location} message={artist.location ? "Got it" : "Where are you based?"} />
            <FormInput type="text" name="shop" value={artist.shop} placeholder="Shop (optional)"
                onChange={onChange} isValid message={artist.shop ? "Noted" : "Optional"} />
            <FormInput type="number" name="years" value={artist.years} placeholder="Years of experience"
                onChange={onChange} isValid={!!artist.years} message={artist.years ? "Thanks" : "Add years"} />
            <FormInput type="number" name="baseRate" value={artist.baseRate} placeholder="Base hourly rate (USD)"
                onChange={onChange} isValid={!!artist.baseRate} message={artist.baseRate ? "Thanks" : "Add your rate"} />
            <FormInput type="text" name="instagram" value={artist.instagram} placeholder="Instagram (optional)"
                onChange={onChange} isValid message={artist.instagram ? "Noted" : "Optional"} />
            <FormInput type="text" name="portfolio" value={artist.portfolio} placeholder="Portfolio URL (optional)"
                onChange={onChange} isValid message={artist.portfolio ? "Noted" : "Optional"} />
        </div>
    );
}