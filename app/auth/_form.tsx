"use client";

import { useState, useTransition } from "react";
import { sendMagicLink } from "@/app/_actions/auth";

export default function SignInForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");
    setMessage("");
    startTransition(async () => {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const result = await sendMagicLink(email, origin);
      if (result.ok) {
        setStatus("sent");
        setMessage("Check your inbox for the sign-in link.");
      } else {
        setStatus("error");
        setMessage(result.error);
      }
    });
  };

  if (status === "sent") {
    return (
      <div className="text-center font-body">
        <p className="text-ink mb-2">Link sent.</p>
        <p className="text-ink-soft italic">
          Open your inbox at{" "}
          <span className="not-italic text-ink">{email}</span> and click the
          link to come in.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 font-body">
      <label className="block">
        <span className="block text-xs uppercase text-ink-soft mb-1.5 font-body tracking-quill">
          Email
        </span>
        <input
          type="email"
          required
          autoFocus
          className="lll-input"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@ky21c.org"
        />
      </label>
      {status === "error" && message && (
        <div className="text-sm text-saffron-deep italic">{message}</div>
      )}
      <button
        type="submit"
        disabled={isPending}
        className="lll-btn-primary w-full"
      >
        {isPending ? "Sending…" : "Send magic link"}
      </button>
    </form>
  );
}
