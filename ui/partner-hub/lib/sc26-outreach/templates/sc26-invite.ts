import type { OutreachTemplate } from "./types";

/**
 * The original approved SC26 invite copy (previously hardcoded in
 * template.ts's renderOutreachEmail()). Content unchanged -- only the
 * merge points are now double-curly placeholders instead of template
 * literal substitutions, so this can be edited from the dashboard before
 * a send instead of only from source.
 */
export const sc26Invite: OutreachTemplate = {
  id: "sc26-invite",
  name: "SC26 Invite",
  description: "The approved DDN @ Supercomputing 2026 outreach email.",
  subject: "DDN at Supercomputing 2026 (SC26) — let's connect in Chicago",
  html: `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#ffffff;">
    <div style="max-width:600px;margin:0 auto;padding:24px 12px;font-family:Calibri,Arial,sans-serif;font-size:15px;line-height:1.5;color:#1a1a1a;">
      <p>Hi {{FIRST_NAME}},</p>

      <p>I wanted to make sure Supercomputing 2026 is on your radar.</p>

      <p>Supercomputing, also known as SC26, is the International Conference for High Performance Computing,
      Networking, Storage, and Analysis. It brings together researchers, technology leaders, infrastructure teams,
      and organizations working on the most demanding AI and HPC workloads.</p>

      <p><strong>Event details</strong></p>
      <ul style="margin:0 0 16px 0;padding-left:20px;">
        <li>When: November 15 to 20, 2026. The exhibit hall will be open November 16 to 19.</li>
        <li>Where: McCormick Place, 2301 S Martin Luther King Dr, Chicago, Illinois.</li>
        <li>More information: <a href="https://sc26.supercomputing.org/">Visit the SC26 website</a></li>
      </ul>

      <p><strong>DDN at SC26</strong><br/>
      DDN will be the Exclusive Aisle Sponsor and will be at booth 4211 with live demonstrations of EXAScaler,
      Infinia, and DDN's AI and HPC infrastructure. We will also feature customer and partner perspectives in our
      booth theater.</p>

      <p>DDN leadership and technical experts will be available throughout the event. The current DDN event
      information highlights Alex Bouzari, CEO and Co Founder, and Mohsen Moazami, Vice Chair. We can help
      coordinate time with the right DDN team member based on your priorities and availability.</p>

      <p>A meeting with DDN would be useful if your team is focused on:</p>
      <ul style="margin:0 0 16px 0;padding-left:20px;">
        <li>Improving data access and application performance for AI or HPC workloads</li>
        <li>Increasing GPU utilization and reducing infrastructure waste</li>
        <li>Scaling storage and data management as workloads grow</li>
        <li>Evaluating parallel file systems, object storage, or a broader AI data platform strategy</li>
        <li>Moving AI projects from experimentation into production with better performance and economics</li>
      </ul>

      <p>If you are planning to attend, reply with the day and time that work best for you, or
      {{BOOKING_LINK}} We will coordinate a 20 to 30 minute
      conversation at the booth or another convenient location in Chicago.</p>

      <p>It would be great to connect while we are both at SC26.</p>

      <p>Best,<br/>{{SENDER_NAME}}</p>

      {{TRACKING_PIXEL}}
    </div>
  </body>
</html>`,
};
