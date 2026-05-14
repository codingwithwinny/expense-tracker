import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Uncaught error:", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "var(--page-bg, #14151a)",
          color: "var(--tx, #F2EDE6)",
          fontFamily: "'Geist', system-ui, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
        <h1
          style={{
            fontSize: "1.375rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
          }}
        >
          Something went wrong
        </h1>
        <p
          style={{
            color: "var(--tm, #B8B1A6)",
            maxWidth: "360px",
            lineHeight: 1.6,
            fontSize: "0.9rem",
            marginBottom: "1.5rem",
          }}
        >
          Don't worry — your data is safe. This was a display issue.
        </p>
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.5rem" }}>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "0.75rem",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "var(--tx, #F2EDE6)",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontFamily: "inherit",
              letterSpacing: "-0.011em",
            }}
          >
            Try Again
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.625rem 1.25rem",
              borderRadius: "0.75rem",
              border: "none",
              background: "linear-gradient(135deg, #818CF8, #22D3EE)",
              color: "#07090F",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              fontFamily: "inherit",
              letterSpacing: "-0.011em",
            }}
          >
            Reload App
          </button>
        </div>
        <details style={{ maxWidth: "480px", width: "100%", textAlign: "left" }}>
          <summary
            style={{
              cursor: "pointer",
              fontSize: "0.75rem",
              color: "var(--tf, #7C7669)",
              userSelect: "none",
            }}
          >
            Technical details
          </summary>
          <pre
            style={{
              marginTop: "0.5rem",
              padding: "0.75rem",
              borderRadius: "0.5rem",
              background: "rgba(0,0,0,0.3)",
              fontSize: "0.65rem",
              color: "var(--tm, #B8B1A6)",
              overflow: "auto",
              maxHeight: "200px",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.5,
            }}
          >
            {error?.toString()}
            {"\n\n"}
            {error?.stack}
          </pre>
        </details>
      </div>
    );
  }
}
