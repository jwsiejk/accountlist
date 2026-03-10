"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { getDefaultResumeProfile, normalizeResumeProfile, resumeProfileToMarkdown } from "@/lib/job-hunter/resumeProfile";
import { loadJobHunterStore, saveJobHunterStore } from "@/lib/job-hunter/storage";
import type { ResumeExperience, ResumeProfile } from "@/lib/job-hunter/types";

const createExperienceEntry = (): ResumeExperience => ({
  company: "",
  title: "",
  start: "",
  end: "",
  bullets: [""],
});

export default function JobHunterResumePage() {
  const [profile, setProfile] = useState<ResumeProfile>(() => {
    const store = loadJobHunterStore();
    return normalizeResumeProfile(store.resumeProfile ?? getDefaultResumeProfile());
  });

  const persistProfile = (nextProfile: ResumeProfile) => {
    const store = loadJobHunterStore();
    const normalized = normalizeResumeProfile(nextProfile);
    saveJobHunterStore({ ...store, resumeProfile: normalized });
    setProfile(normalized);
  };

  const copyMarkdown = async () => {
    const markdown = resumeProfileToMarkdown(profile);
    await navigator.clipboard.writeText(markdown);
  };

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Resume Manager</h1>
          <Link className="text-sm text-blue-600 hover:underline" href="/job-hunter">
            Back to Job Hunter
          </Link>
        </div>
        <p className="text-sm text-foreground/70">Edit your resume profile used for deterministic tailoring output.</p>
      </header>

      <section className="space-y-3 rounded-lg border border-border/60 p-4">
        <h2 className="text-sm font-semibold">Candidate Identity</h2>
        <div className="grid gap-2 md:grid-cols-2">
          <input className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))} placeholder="Full name" value={profile.fullName} />
          <input className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" onChange={(e) => setProfile((p) => ({ ...p, headline: e.target.value }))} placeholder="Headline (optional)" value={profile.headline ?? ""} />
          <input className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} placeholder="Email" value={profile.email} />
          <input className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" value={profile.phone} />
          <input className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" onChange={(e) => setProfile((p) => ({ ...p, cityState: e.target.value }))} placeholder="City, State" value={profile.cityState} />
          <input className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" onChange={(e) => setProfile((p) => ({ ...p, linkedinUrl: e.target.value }))} placeholder="LinkedIn URL" value={profile.linkedinUrl} />
          <input className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" onChange={(e) => setProfile((p) => ({ ...p, websiteUrl: e.target.value }))} placeholder="Website URL (optional)" value={profile.websiteUrl ?? ""} />
          <input className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" onChange={(e) => setProfile((p) => ({ ...p, signatureLine: e.target.value }))} placeholder="Signature line (e.g. Best regards,)" value={profile.signatureLine} />
        </div>
        <textarea
          className="min-h-20 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
          onChange={(event) => setProfile((prev) => ({ ...prev, workAuthorizationNote: event.target.value }))}
          placeholder="Work authorization note"
          value={profile.workAuthorizationNote}
        />
      </section>

      <section className="space-y-3 rounded-lg border border-border/60 p-4">
        <h2 className="text-sm font-semibold">Summary</h2>
        <textarea
          className="min-h-24 w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
          onChange={(event) => setProfile((prev) => ({ ...prev, summary: event.target.value }))}
          value={profile.summary}
        />
      </section>

      <section className="space-y-3 rounded-lg border border-border/60 p-4">
        <h2 className="text-sm font-semibold">Skills</h2>
        <div className="space-y-2">
          {profile.skills.map((skill, index) => (
            <div className="flex gap-2" key={`skill-${index}`}>
              <input
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, skills: prev.skills.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)) }))
                }
                value={skill}
              />
              <Button
                onClick={() => setProfile((prev) => ({ ...prev, skills: prev.skills.filter((_, itemIndex) => itemIndex !== index) }))}
                size="sm"
                type="button"
                variant="destructive"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <Button onClick={() => setProfile((prev) => ({ ...prev, skills: [...prev.skills, ""] }))} size="sm" type="button" variant="secondary">
          Add skill
        </Button>
      </section>

      <section className="space-y-3 rounded-lg border border-border/60 p-4">
        <h2 className="text-sm font-semibold">Experience</h2>
        <div className="space-y-4">
          {profile.experience.map((experience, index) => (
            <div className="space-y-2 rounded-md border border-border/60 p-3" key={`experience-${index}`}>
              <div className="grid gap-2 md:grid-cols-2">
                <input className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" onChange={(event) => setProfile((prev) => ({ ...prev, experience: prev.experience.map((item, itemIndex) => itemIndex === index ? { ...item, company: event.target.value } : item) }))} placeholder="Company" value={experience.company} />
                <input className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" onChange={(event) => setProfile((prev) => ({ ...prev, experience: prev.experience.map((item, itemIndex) => itemIndex === index ? { ...item, title: event.target.value } : item) }))} placeholder="Title" value={experience.title} />
                <input className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" onChange={(event) => setProfile((prev) => ({ ...prev, experience: prev.experience.map((item, itemIndex) => itemIndex === index ? { ...item, start: event.target.value } : item) }))} placeholder="Start" value={experience.start ?? ""} />
                <input className="rounded-md border border-border/60 bg-background px-3 py-2 text-sm" onChange={(event) => setProfile((prev) => ({ ...prev, experience: prev.experience.map((item, itemIndex) => itemIndex === index ? { ...item, end: event.target.value } : item) }))} placeholder="End" value={experience.end ?? ""} />
              </div>
              <p className="text-xs font-medium uppercase text-foreground/70">Bullets</p>
              {experience.bullets.map((bullet, bulletIndex) => (
                <div className="flex gap-2" key={`experience-${index}-bullet-${bulletIndex}`}>
                  <input className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm" onChange={(event) => setProfile((prev) => ({ ...prev, experience: prev.experience.map((item, itemIndex) => itemIndex === index ? { ...item, bullets: item.bullets.map((line, lineIndex) => (lineIndex === bulletIndex ? event.target.value : line)) } : item) }))} value={bullet} />
                  <Button onClick={() => setProfile((prev) => ({ ...prev, experience: prev.experience.map((item, itemIndex) => itemIndex === index ? { ...item, bullets: item.bullets.filter((_, lineIndex) => lineIndex !== bulletIndex) } : item) }))} size="sm" type="button" variant="destructive">Remove</Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Button onClick={() => setProfile((prev) => ({ ...prev, experience: prev.experience.map((item, itemIndex) => itemIndex === index ? { ...item, bullets: [...item.bullets, ""] } : item) }))} size="sm" type="button" variant="secondary">Add bullet</Button>
                <Button onClick={() => setProfile((prev) => ({ ...prev, experience: prev.experience.filter((_, itemIndex) => itemIndex !== index) }))} size="sm" type="button" variant="destructive">Remove experience</Button>
              </div>
            </div>
          ))}
        </div>
        <Button onClick={() => setProfile((prev) => ({ ...prev, experience: [...prev.experience, createExperienceEntry()] }))} size="sm" type="button" variant="secondary">
          Add experience
        </Button>
      </section>

      <section className="space-y-3 rounded-lg border border-border/60 p-4">
        <h2 className="text-sm font-semibold">Achievements</h2>
        <div className="space-y-2">
          {profile.achievements.map((achievement, index) => (
            <div className="flex gap-2" key={`achievement-${index}`}>
              <input
                className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm"
                onChange={(event) =>
                  setProfile((prev) => ({
                    ...prev,
                    achievements: prev.achievements.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
                  }))
                }
                value={achievement}
              />
              <Button
                onClick={() => setProfile((prev) => ({ ...prev, achievements: prev.achievements.filter((_, itemIndex) => itemIndex !== index) }))}
                size="sm"
                type="button"
                variant="destructive"
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
        <Button
          onClick={() => setProfile((prev) => ({ ...prev, achievements: [...prev.achievements, ""] }))}
          size="sm"
          type="button"
          variant="secondary"
        >
          Add achievement
        </Button>
      </section>

      <section className="flex flex-wrap gap-2">
        <Button onClick={() => persistProfile(profile)} type="button">Save profile</Button>
        <Button onClick={() => persistProfile(getDefaultResumeProfile())} type="button" variant="secondary">Reset to defaults</Button>
        <Button onClick={copyMarkdown} type="button" variant="ghost">Copy markdown</Button>
      </section>
    </main>
  );
}
