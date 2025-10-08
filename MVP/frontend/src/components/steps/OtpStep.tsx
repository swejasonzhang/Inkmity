import FormInput from "@/components/dashboard/FormInput";

export default function OtpStep({
    code, setCode, onBack, onVerify, loading,
}: {
    code: string;
    setCode: (v: string) => void;
    onBack: () => void;
    onVerify: () => void;
    loading: boolean;
}) {
    return (
        <div className="grid gap-5">
            <FormInput
                type="text"
                name="code"
                value={code}
                placeholder="Enter verification code"
                onChange={(e) => setCode(e.target.value)}
                isValid={!!code}
                message={code ? "Code entered" : "Check your email for the code"}
            />
            <div className="flex items-center gap-3 mt-2">
                <button type="button" onClick={onBack} className="bg-white/10 hover:bg-white/20 text-white w-28 rounded-xl px-3 py-2">
                    Back
                </button>
                <button
                    type="button"
                    onClick={onVerify}
                    disabled={loading}
                    className="bg-white/15 hover:bg-white/25 text-white flex-1 rounded-xl px-3 py-2 disabled:opacity-60"
                >
                    Verify & Continue
                </button>
            </div>
        </div>
    );
}