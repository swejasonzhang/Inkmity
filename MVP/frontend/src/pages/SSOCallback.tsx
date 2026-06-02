import { AuthenticateWithRedirectCallback } from "@clerk/clerk-react";
import { Spinner } from "@/components/ui/spinner";
import VideoBackground from "@/components/VideoBackground";

export default function SSOCallback() {
    return (
        <div className="relative h-svh flex flex-col items-center justify-center text-app">
            <VideoBackground />
            <div className="flex flex-col items-center gap-4">
                <Spinner size={40} className="text-app" />
                <p className="text-sm text-subtle">Completing sign in…</p>
            </div>
            <AuthenticateWithRedirectCallback
                signInForceRedirectUrl="/onboarding"
                signUpForceRedirectUrl="/onboarding"
            />
        </div>
    );
}
