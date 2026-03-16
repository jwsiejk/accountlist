import { JobDetailClient } from "./JobDetailClient";

type PageProps = {
  params: Promise<{
    jobId: string;
  }>;
};

export default async function JobDetailPage({ params }: PageProps) {
  const { jobId } = await params;

  return <JobDetailClient jobId={jobId} />;
}
