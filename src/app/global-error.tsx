"use client";

// Last-resort boundary for errors thrown in the root layout itself. It replaces
// the whole document, so it renders its own <html>/<body> and avoids any app
// context (i18n/theme may be unavailable here). Kept minimal and robust.
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#f8f3ea",
          color: "#18231d",
          padding: "1.5rem",
        }}
      >
        <div style={{ maxWidth: "28rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600, margin: "0 0 0.5rem" }}>
            Something went wrong
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#6f6a5f", margin: "0 0 1.25rem" }}>
            Bloomprint hit an unexpected error. Your saved plans are stored on this device and are
            safe.
          </p>
          <button
            onClick={reset}
            style={{
              border: 0,
              borderRadius: "9999px",
              background: "#244735",
              color: "#fff8ef",
              padding: "0.625rem 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
