import FormInput from "@/components/dashboard/FormInput";

type ClientProfile = {
    budget: string;
    location: string;
    placement: string;
    size: string;
    notes: string;
};

export default function ClientDetailsStep({
    client, onChange,
}: {
    client: ClientProfile;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}) {
    return (
        <div className="grid gap-4">
            <FormInput type="number" name="budget" value={client.budget} placeholder="Estimated budget (USD)"
                onChange={onChange} isValid={!!client.budget} message={client.budget ? "Thanks" : "Add your budget"} />
            <FormInput type="text" name="location" value={client.location} placeholder="Your city / region"
                onChange={onChange} isValid={!!client.location} message={client.location ? "Got it" : "Where are you located?"} />
            <FormInput type="text" name="placement" value={client.placement} placeholder="Placement (e.g., forearm)"
                onChange={onChange} isValid message={client.placement ? "Noted" : "Optional"} />
            <FormInput type="text" name="size" value={client.size} placeholder="Approximate size (e.g., 4in)"
                onChange={onChange} isValid message={client.size ? "Noted" : "Optional"} />
        </div>
    );
}