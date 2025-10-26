import { useEffect, useRef, useState } from "react";
import { useSignUp } from "@clerk/clerk-react";
import FormInput from "@/components/dashboard/shared/FormInput";

function fmtMMSS(total?: number) {
    if (!Number.isFinite(total)) return "--:--";
    const t = Math.max(0, Math.floor(total as number));
    const mm = String(Math.floor(t / 60)).padStart(2, "0");
    const ss = String(t % 60).padStart(2, "0");
    return `${mm}:${ss}`;
}

type Props = {
    code: string;
    setCode: (v: string) => void;
    onVerify: () => void;
    onBack: () => void;
    loading: boolean;
    initialExpirySec?: number;
    initialCooldownSec?: number;
};

export default function OtpStep({
    code,
    setCode,
    onVerify,
    onBack,
    loading,
    initialExpirySec = 300,
    initialCooldownSec = 30,
}: Props) {
    const { isLoaded, signUp } = useSignUp();

    const [secsLeft, setSecsLeft] = useState<number>(initialExpirySec);
    const [cooldownLeft, setCooldownLeft] = useState<number>(0);
    const [resending, setResending] = useState<boolean>(false);
    const tickRef = useRef<number | null>(null);

    useEffect(() => {
        if (tickRef.current) clearInterval(tickRef.current);
        tickRef.current = window.setInterval(() => {
            setSecsLeft((s) => (s > 0 ? s - 1 : 0));
            setCooldownLeft((c) => (c > 0 ? c - 1 : 0));
        }, 1000) as unknown as number;
        return () => {
            if (tickRef.current) clearInterval(tickRef.current);
        };
    }, []);

    const handleResend = async () => {
        if (!isLoaded || !signUp || resending || cooldownLeft > 0) return;
        setResending(true);
        try {
            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
            setSecsLeft(initialExpirySec);
            setCooldownLeft(initialCooldownSec);
        } finally {
            setResending(false);
        }
    };

    const codeOk = code.trim().length === 6;

    return (
        <div className="grid gap-5">
            <FormInput
                type="text"
                name="code"
                value={code}
                placeholder="Enter 6-digit code"
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                isValid={codeOk}
                message={codeOk ? "Code looks good" : "Check your email for the code"}
            />

            <div className="flex items-center justify-between text-xs text-white/70 -mt-2">
                <span>Expires in {fmtMMSS(secsLeft)}</span>

                <button
                    type="button"
                    onClick={handleResend}
                    className="rounded-lg px-3 py-1.5 bg-white/10 hover:bg-white/15 text-white disabled:opacity-50"
                    disabled={resending || cooldownLeft > 0}
                >
                    {resending ? "Sending…" : `Resend code${cooldownLeft > 0 ? ` (wait ${cooldownLeft}s)` : ""}`}
                </button>
            </div>

            <div className="flex items-center gap-3 mt-2">
                <button
                    type="button"
                    onClick={onBack}
                    className="bg-white/10 hover:bg-white/20 text-white rounded-xl px-3 py-2 disabled:opacity-60"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={onVerify}
                    disabled={loading || !codeOk}
                    className="bg-white/15 hover:bg-white/25 text-white flex-1 rounded-xl px-3 py-2 disabled:opacity-60"
                >
                    Verify & Continue
                </button>
            </div>
        </div>
    );
}