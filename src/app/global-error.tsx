"use client";

/** Last-resort boundary for errors thrown in the root layout itself. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#555", marginBottom: 24 }}>Please refresh the page or try again in a moment.</p>
          <button
            onClick={reset}
            style={{ padding: "10px 20px", borderRadius: 10, border: "none", background: "#77773c", color: "white", cursor: "pointer" }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
