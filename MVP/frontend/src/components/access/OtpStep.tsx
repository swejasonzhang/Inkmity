import { useEffect, useRef, useState } from "react";
import { useSignUp } from "@clerk/clerk-react";

const LEN = 6;

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
    const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
    const submittedRef = useRef(false);

    useEffect(() => {
        tickRef.current = window.setInterval(() => {
            setSecsLeft((s) => (s > 0 ? s - 1 : 0));
            setCooldownLeft((c) => (c > 0 ? c - 1 : 0));
        }, 1000) as unknown as number;
        return () => {
            if (tickRef.current) clearInterval(tickRef.current);
        };
    }, []);

    useEffect(() => {
        inputsRef.current[0]?.focus();
    }, []);

    const codeOk = code.length === LEN;

    useEffect(() => {
        if (codeOk && !loading && !submittedRef.current) {
            submittedRef.current = true;
            onVerify();
        }
        if (code.length < LEN) submittedRef.current = false;
    }, [code, codeOk, loading, onVerify]);

    const setAt = (i: number, value: string) => {
        const arr = Array.from({ length: LEN }, (_, k) => code[k] || "");
        arr[i] = value;
        setCode(arr.join("").replace(/\D/g, "").slice(0, LEN));
    };

    const handleChange = (i: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const v = e.target.value.replace(/\D/g, "");
        if (!v) return;
        if (v.length > 1) {
            const arr = Array.from({ length: LEN }, (_, k) => code[k] || "");
            for (let k = 0; k < v.length && i + k < LEN; k++) arr[i + k] = v[k];
            setCode(arr.join("").slice(0, LEN));
            inputsRef.current[Math.min(i + v.length, LEN - 1)]?.focus();
            return;
        }
        setAt(i, v);
        if (i < LEN - 1) inputsRef.current[i + 1]?.focus();
    };

    const handleKeyDown = (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace") {
            e.preventDefault();
            if (code[i]) {
                setAt(i, "");
            } else if (i > 0) {
                setAt(i - 1, "");
                inputsRef.current[i - 1]?.focus();
            }
        } else if (e.key === "ArrowLeft" && i > 0) {
            inputsRef.current[i - 1]?.focus();
        } else if (e.key === "ArrowRight" && i < LEN - 1) {
            inputsRef.current[i + 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const text = (e.clipboardData.getData("text") || "").replace(/\D/g, "").slice(0, LEN);
        if (!text) return;
        setCode(text);
        inputsRef.current[Math.min(text.length, LEN - 1)]?.focus();
    };

    const handleResend = async () => {
        if (!isLoaded || !signUp || resending || cooldownLeft > 0) return;
        setResending(true);
        try {
            await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
            setCode("");
            setSecsLeft(initialExpirySec);
            setCooldownLeft(initialCooldownSec);
            inputsRef.current[0]?.focus();
        } finally {
            setResending(false);
        }
    };

    const expired = secsLeft <= 0;

    return (
        <div className="grid gap-5 w-full">
            <div className="text-center">
                <p className="text-sm font-semibold text-app">Enter your verification code</p>
                <p className="mt-1 text-xs text-app/60">We sent a 6-digit code to your email.</p>
            </div>

            <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
                {Array.from({ length: LEN }).map((_, i) => (
                    <input
                        key={i}
                        ref={(el) => { inputsRef.current[i] = el; }}
                        type="text"
                        inputMode="numeric"
                        autoComplete={i === 0 ? "one-time-code" : "off"}
                        maxLength={1}
                        value={code[i] || ""}
                        onChange={(e) => handleChange(i, e)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        onFocus={(e) => e.currentTarget.select()}
                        className="h-12 w-10 sm:w-11 rounded-xl bg-white border border-black/10 text-black text-center text-lg font-bold outline-none focus:ring-2 focus:ring-black/30 transition"
                        aria-label={`Digit ${i + 1}`}
                    />
                ))}
            </div>

            <div className="flex items-center justify-center gap-3 text-xs text-app/60 -mt-1">
                <span className={expired ? "text-red-400" : ""}>
                    {expired ? "Code expired" : `Expires in ${fmtMMSS(secsLeft)}`}
                </span>
                <span aria-hidden>·</span>
                <button
                    type="button"
                    onClick={handleResend}
                    className="font-semibold text-app hover:opacity-80 underline underline-offset-2 disabled:opacity-40 disabled:no-underline"
                    disabled={resending || cooldownLeft > 0}
                >
                    {resending ? "Sending…" : cooldownLeft > 0 ? `Resend in ${cooldownLeft}s` : "Resend code"}
                </button>
            </div>

            <div className="flex items-center gap-2 mt-1">
                <button
                    type="button"
                    onClick={onBack}
                    className="h-11 rounded-xl px-4 text-sm font-semibold bg-elevated border border-app text-app hover:bg-elevated/70 transition"
                >
                    Back
                </button>
                <button
                    type="button"
                    onClick={() => { submittedRef.current = true; onVerify(); }}
                    disabled={loading || !codeOk}
                    className="flex-1 h-11 rounded-xl text-sm font-semibold bg-neutral-700 text-white hover:bg-neutral-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Verifying…" : "Verify & Continue"}
                </button>
            </div>
        </div>
    );
}
