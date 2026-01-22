import { InterviewTool } from "@/components/interview/InterviewTool";

const aiInterviewEnabled = process.env.NEXT_PUBLIC_ENABLE_AI_INTERVIEW === "true";

export default function InterviewPage() {
  if (!aiInterviewEnabled) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 py-16">
        <div className="max-w-lg rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-foreground/40">AI Interview</p>
          <h1 className="mt-3 text-2xl font-semibold text-foreground">AI Interview is disabled</h1>
          <p className="mt-3 text-sm text-foreground/60">
            Set the <span className="font-semibold">NEXT_PUBLIC_ENABLE_AI_INTERVIEW</span> flag to &quot;true&quot; to enable
            this tool.
          </p>
        </div>
      </div>
    );
  }

  return <InterviewTool />;
}
