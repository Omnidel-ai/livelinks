import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignInForm from "./_form";

export const dynamic = "force-dynamic";

export default async function AuthPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  return (
    <main className="lll-root flex flex-1 items-center justify-center px-6 py-24">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 text-xs uppercase text-ink-soft mb-4 font-body tracking-paper">
            <span className="dot-saffron"></span>
            <span>The Gunakul · Living Library</span>
          </div>
          <h1 className="font-display text-4xl text-ink leading-none">
            Sign in
          </h1>
          <p className="mt-4 text-ink-soft font-body italic">
            Magic-link only. Restricted to{" "}
            <span className="not-italic text-ink">@ky21c.org</span>.
          </p>
        </div>
        <SignInForm />
      </div>
    </main>
  );
}
