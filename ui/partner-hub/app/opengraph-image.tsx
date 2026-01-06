import type { ImageResponse } from "next/og";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 96,
          background: "linear-gradient(135deg, #0b1120 0%, #111827 100%)",
          color: "#f8fafc",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: 60,
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: 24,
          }}
        >
          Portfolio Hub
        </div>
        <div style={{ fontSize: 28, maxWidth: 900, lineHeight: 1.4 }}>
          Presales data center infrastructure portfolio with tools, architectures, and proof
          points that help move opportunities forward.
        </div>
        <div style={{ marginTop: 48, display: "flex", gap: 16, fontSize: 22 }}>
          <span style={{ padding: "10px 18px", border: "1px solid #334155", borderRadius: 999 }}>
            Reference designs
          </span>
          <span style={{ padding: "10px 18px", border: "1px solid #334155", borderRadius: 999 }}>
            Sizing tools
          </span>
          <span style={{ padding: "10px 18px", border: "1px solid #334155", borderRadius: 999 }}>
            Energy insights
          </span>
        </div>
      </div>
    ),
    size
  );
}
