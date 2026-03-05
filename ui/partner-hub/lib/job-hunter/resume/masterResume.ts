export type ResumeExperience = {
  company: string;
  role: string;
  highlights: string[];
};

export type MasterResume = {
  name: string;
  title: string;
  summary: string;
  skills: string[];
  achievements: string[];
  experience: ResumeExperience[];
};

export const masterResume: MasterResume = {
  name: "Candidate Name",
  title: "Solutions Architect / Partner-Facing Technical Leader",
  summary:
    "Technical leader with partner and post-sales experience across enterprise infrastructure, cloud, and storage modernization programs.",
  skills: [
    "Solutions architecture",
    "Partner enablement",
    "Post-sales delivery",
    "Infrastructure modernization",
    "Storage strategy",
    "Cloud architecture",
  ],
  achievements: [
    "Improved partner-led solution win rates by creating repeatable reference architectures.",
    "Led post-sales delivery motions for complex enterprise infrastructure programs.",
    "Built technical workshops that helped account teams accelerate customer decisions.",
  ],
  experience: [
    {
      company: "Example Company",
      role: "Senior Solutions Architect",
      highlights: [
        "Designed multi-vendor infrastructure and storage solutions for enterprise customers.",
        "Ran joint account planning with partner teams and field sellers.",
      ],
    },
  ],
};
