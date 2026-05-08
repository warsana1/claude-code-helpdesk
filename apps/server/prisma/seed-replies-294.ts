import "dotenv/config";
import { PrismaClient, SenderType } from "../src/generated/prisma";

const prisma = new PrismaClient();

const TICKET_ID = 294;

const ticket = await prisma.ticket.findUnique({ where: { id: TICKET_ID } });
if (!ticket) {
  console.error(`Ticket ${TICKET_ID} not found.`);
  await prisma.$disconnect();
  process.exit(1);
}

const agent = await prisma.user.findFirst({ select: { id: true, name: true } });
if (!agent) {
  console.error("No agent user found. Run seed-agent.ts first.");
  await prisma.$disconnect();
  process.exit(1);
}

const customerName = ticket.fromName;
const agentName = agent.name;

type ReplyDraft = { senderType: SenderType; body: string };

const replies: ReplyDraft[] = [
  {
    senderType: SenderType.customer,
    body: `Hi there,

I wanted to follow up on my original ticket because the issue is still happening and it's starting to impact our daily operations more seriously.

To give you a clearer picture: we first noticed the problem about two weeks ago, right after you pushed the v2.14 update. Since then, every morning between 9 AM and 10 AM our time (UTC+2), the system becomes extremely slow or completely unresponsive for roughly 20 to 40 minutes.

During that window, our support agents cannot load any ticket views, the search function returns a timeout error, and the reply editor either fails to save or takes over a minute to submit. This is our peak traffic period, so the timing could not be worse.

We have already tried the following steps without success:
- Cleared browser cache and cookies on all machines
- Switched from Chrome to Firefox and Edge to rule out browser-specific issues
- Disabled all browser extensions
- Tested from two different office networks and a 4G mobile hotspot
- Restarted our local DNS resolver

The problem is fully reproducible every weekday morning. On weekends it does not seem to occur, which makes me think it might be related to load on your infrastructure during business hours.

We have about 35 agents currently active on the account and handle roughly 800 tickets per day. Could you please investigate this urgently? We are losing around 30 minutes of productive time per agent every day because of this.

Thank you,
${customerName}`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi ${customerName},

Thank you for the detailed follow-up and for the thorough troubleshooting steps you have already taken — this information is genuinely helpful and saves us a lot of diagnostic time.

I have reviewed your account and can confirm that the timing you describe (9–10 AM UTC+2, i.e. 7–8 AM UTC) does coincide with a period of elevated load on our infrastructure as European and African customer segments come online. This is a known pressure point and we are actively working on capacity improvements.

That said, the severity you are describing — complete unresponsiveness rather than just slowness — suggests something more specific to your account or data volume may be amplifying the issue. I want to dig deeper.

Here is what I need from you to investigate further:

1. Browser console errors: During the slow window, please open Developer Tools (F12), go to the Console tab, and copy any red error messages you see. Do the same in the Network tab and look for any requests showing status 503, 504, or "pending" for more than 10 seconds.

2. Specific endpoints: Does the slowness affect all parts of the application equally, or is it worse in specific areas (e.g., ticket list, search, the reply editor)?

3. Account activity logs: I will pull server-side latency metrics for your account ID (I can see it on my end) for the past two weeks and cross-reference them with our infrastructure logs.

4. Workspace size: You mentioned 800 tickets per day — approximately how many total tickets does your workspace have? Large datasets can affect certain query-heavy views.

I am escalating this internally to our infrastructure team and will follow up within one business day with findings. In the meantime, if the issue occurs again tomorrow morning, please note the exact time (with timezone) and capture those console logs.

I apologise for the disruption this is causing your team.

Best regards,
${agentName}`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi ${agentName},

Thank you for the quick response and for escalating this. Here are the answers to your questions:

1. Browser console errors: During this morning's slowdown (9:07 AM to 9:44 AM our time), I captured the following in the console:
   - [Error] Failed to load resource: net::ERR_CONNECTION_TIMED_OUT — /api/tickets?page=1&status=open
   - [Error] Failed to load resource: the server responded with a status of 504 (Gateway Timeout) — /api/search
   - [Warning] Unhandled Promise rejection: AxiosError: timeout of 30000ms exceeded

2. Specific endpoints: Yes, it is definitely worse in specific areas. The ticket list view and search are the worst — they either time out or show a spinner indefinitely. The dashboard overview page loads eventually (maybe 45 seconds), but the ticket detail pages sometimes work fine even when the list does not. The reply editor saves eventually but takes 60–90 seconds.

3. Workspace size: We have approximately 47,000 total tickets in the system going back about 18 months. We archive resolved tickets monthly but the archive search is still part of the main query, which might be relevant.

4. Additional detail I forgot to mention: we use the API integration with our CRM (Salesforce) which syncs ticket status updates every 5 minutes. I wonder if the sync job is running at 9 AM and contributing to the load?

I will continue capturing logs tomorrow morning. I've also asked two colleagues in different physical locations to test simultaneously tomorrow — one is in our London office and another is remote in Warsaw — to confirm this is server-side and not a regional network issue.

Please let me know what the infrastructure team finds.

Thanks,
${customerName}`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi ${customerName},

This is extremely useful information — the 504 Gateway Timeout errors on /api/tickets and /api/search tell us a lot. Let me share what the infrastructure team found after reviewing your account's server-side metrics.

Findings so far:

1. Query performance: Your workspace has 47,000 tickets which puts you in roughly the top 5% of accounts by data volume. We found that the "open tickets" query your agents use most frequently is performing a full table scan instead of using the expected index. This is a regression introduced in v2.14 — the query planner is ignoring the composite index on (status, createdAt) in certain conditions. This explains why the ticket list and search are the worst-affected endpoints.

2. Salesforce sync timing: You are absolutely right to flag the CRM sync. Our logs show your Salesforce sync job runs at 9:00 AM, 9:05 AM, 9:10 AM, etc. Each sync job locks a small number of rows while writing status updates. Under normal conditions this is imperceptible, but combined with the slow query issue it creates a compounding effect — slow queries hold connections longer, which means the sync locks are held longer, which slows subsequent queries further.

3. Immediate mitigations I can apply right now:
   - I can reschedule your Salesforce sync to run at 9:03-minute intervals offset from the top of the hour, which reduces collision probability.
   - I can enable a query timeout bypass flag for your account that routes your ticket list queries through a read replica. This is available for enterprise-tier accounts and you qualify.

4. Permanent fix: Our engineering team has a patch for the v2.14 index regression scheduled for the v2.14.3 release, which is targeted for this Thursday.

Can you confirm you are happy for me to apply the two immediate mitigations now? I will not change anything without your approval.

Best regards,
${agentName}`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi ${agentName},

Yes, absolutely — please go ahead and apply both mitigations. Thank you for explaining the root cause so clearly. It helps enormously to understand what is actually happening rather than just being told "we are looking into it."

A few follow-up questions while you do that:

1. The read replica routing — will this affect data freshness? Our agents sometimes reply to a ticket and then immediately refresh the list to confirm the status change. If there is any replication lag we might see stale data momentarily. Even a 1–2 second lag would be acceptable, but I want to make sure our team knows what to expect so they do not raise false bug reports.

2. Thursday's v2.14.3 patch — will this require any downtime? We would like to plan around it if there is a maintenance window. Our lowest traffic period is between 2 AM and 4 AM UTC on weekdays if that helps you schedule.

3. The Salesforce sync rescheduling — will this affect the sync frequency itself? We currently rely on near-real-time status updates flowing into Salesforce for our SLA reporting dashboard. If the 5-minute interval is preserved but just offset slightly, that is completely fine.

4. Is there anything we can do on our end to reduce the query load? For example, should our agents be using filtered views (e.g., "my open tickets") rather than the global open tickets view? We could change our team's default workflow if it helps.

Tomorrow morning will be the real test. I will have three agents reporting to me at 9 AM with their browsers open and I will email you immediately if the issue persists.

Thanks again for the thorough investigation.
${customerName}`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi ${customerName},

Both mitigations have been applied to your account as of 3:47 PM UTC today. Here are the answers to your follow-up questions:

1. Read replica replication lag: The replication lag on our read replicas is currently 200–400 milliseconds under normal load. For your use case — agent replies a ticket then refreshes the list — this is well within an acceptable range. The ticket detail page (where agents write replies) always reads from the primary database, so the reply itself will always be immediately consistent. Only the list view routes through the replica. I would recommend informing your team that a very brief delay on the list view is normal and expected.

2. v2.14.3 patch and downtime: The patch is a zero-downtime deployment — we use a rolling restart strategy so there will be no maintenance window required. You will not need to plan around it. However, I will send you a notification 30 minutes before the deploy begins so you are aware.

3. Salesforce sync frequency: The sync interval remains exactly 5 minutes. I have only changed the offset so that it runs at :03, :08, :13, etc. rather than :00, :05, :10, etc. This should have zero impact on your SLA reporting dashboard.

4. Workflow recommendations: Yes — encouraging agents to use filtered views is genuinely beneficial. The "My open tickets" view uses a much simpler query (filtered by assignee ID) compared to the global open tickets view which must scan all open tickets across your workspace. If your agents can default to their personal queue and only use the global view when specifically needed, that would reduce query load by an estimated 40% during peak hours. I would recommend this as a workflow change regardless of the patch.

I will monitor your account's query performance metrics tomorrow morning between 9 AM and 10 AM UTC+2 personally and will proactively update you by 10:30 AM your time.

Best regards,
${agentName}`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi ${agentName},

Great news to report from this morning! The 9 AM window was dramatically better. Here is what we observed:

The ticket list loaded in approximately 3–4 seconds instead of timing out. Search returned results in under 5 seconds. The reply editor saved immediately. None of the three agents I had monitoring the system reported any issues during the 9 AM to 10 AM window.

I checked the browser console and there were zero 504 errors — the only notable entry was one 200ms delayed request around 9:12 AM which barely registered.

So the mitigations have made a significant difference. Thank you for the fast turnaround on this.

A couple of observations I wanted to share:

- The global tickets view is noticeably snappier even outside of peak hours, which I assume is the read replica benefit carrying over to normal usage as well.
- I have briefed our team lead about switching to the "My open tickets" default view. We are rolling that out as a team standard starting Monday.

One lingering concern: we noticed one agent reported that after submitting a reply at 9:08 AM, the ticket status in the list showed "open" for about 2 seconds before refreshing to "pending reply." This matches exactly the replication lag you described (200–400ms in practice took about 2 seconds in this case, possibly because the replica was slightly busier at peak). The agent was briefly confused. I will add a note in our internal wiki explaining this is expected behaviour.

Are we still on track for the v2.14.3 patch Thursday? And should I close this ticket once the patch is confirmed deployed, or do you prefer to leave it open until we have observed a full week of stable operation?

Thanks,
${customerName}`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi ${customerName},

I am very glad to hear this morning went well — that is exactly the improvement we were hoping for.

On your observations:

The 2-second replication lag during peak hours is within expected parameters, though slightly higher than our average of 200–400ms. Under high write load (which 9 AM represents for your workspace), the replica can lag up to 2–3 seconds. This is a known characteristic of our replica architecture. You have handled it perfectly by documenting it for your team — that is exactly the right approach.

Regarding the v2.14.3 patch: I can confirm it is still scheduled for Thursday. I just checked with the release team and the deploy is planned for 6:00 AM UTC. I will message you as promised about 30 minutes before. Once the patch is deployed, the index regression will be permanently resolved and the read replica routing for list queries (which I enabled as a mitigation) will remain in place as a performance enhancement regardless, since it benefits any large workspace.

On closing the ticket: my recommendation is to keep it open until we have confirmed the patch has deployed successfully and you have observed one full day of normal operation post-patch. Once you confirm stability on Thursday or Friday, I will mark it resolved. That way we have a clean record and if anything unexpected surfaces post-patch, this thread has all the context.

One additional thing I wanted to flag: while investigating your account I noticed your Salesforce sync is configured to sync all ticket fields on every run, including fields that never change (like ticket ID, creation date, and customer email). I can adjust the sync to only transmit changed fields (a delta sync), which would reduce the sync job's write load by approximately 60–70%. Would you like me to make that change as well?

Best regards,
${agentName}`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi ${agentName},

Yes please, go ahead with the delta sync optimisation — that sounds like a very sensible improvement. If it reduces write load that significantly, it can only help long-term performance and it sounds like a zero-risk change. Please apply it at your convenience.

Quick update from today (Wednesday): performance has remained good all morning. No timeouts, no 504 errors reported by any agent. The team has mostly adopted the "My open tickets" default view and the few who are still using the global view have not reported issues either.

I did notice one thing I wanted to ask about: when I look at the Salesforce sync logs on our end, I can see that each sync run is logging "modified: 0 records" for about 80% of runs. This makes sense given how you described the full-field sync — most of the time nothing has changed but it still wrote all the fields anyway. The delta sync should fix that, but it does confirm your diagnosis was accurate.

Also, I want to make sure we are prepared for the patch tomorrow. Questions:

1. Is there anything our agents should do before the deploy starts at 6 AM UTC? Should they save any open draft replies before then, or does the rolling restart preserve in-progress sessions?

2. Is there a status page or incident feed we should subscribe to for future awareness of issues like this? We were unaware of the v2.14 regression until it had been affecting us for two weeks.

3. After this is all resolved, I would like to schedule a brief call with our account manager to discuss proactive monitoring options. Is that something you can arrange?

Looking forward to Thursday's patch.
${customerName}`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi ${customerName},

I have applied the delta sync configuration to your Salesforce integration as of 2:15 PM UTC today. The next sync run (in approximately 3 minutes from now) will be the first to use the new logic. You should see the "modified: 0 records" noise disappear for runs where nothing has changed, and only genuinely modified tickets will generate write operations.

To answer your questions:

1. Pre-patch preparation: The rolling restart is session-safe — agents do not need to do anything before the deploy. Active sessions are maintained across the restart. However, as a precaution, I would advise that any agent with a very long unsaved draft (say, a draft they have been composing for more than 10 minutes) saves it to a text editor as a backup. In practice, drafts are saved to localStorage in the browser so they should survive a page reload, but it is good practice for any maintenance window.

2. Status page: Yes — our status page is at status.helpdesk.io and it is updated in real time during any incident. We also have an RSS feed and email subscription option on that page. I strongly recommend subscribing; the v2.14 regression should have triggered an incident notification there and I will follow up internally to understand why it did not. I will also look into whether your account can be added to our proactive outreach list for incidents affecting large workspaces.

3. Account manager call: Absolutely. I will send a calendar invite to the email on your account for a 30-minute call. Please let me know if there is a preferred day/time next week and I will coordinate with your account manager accordingly.

The delta sync is now active and I will confirm the patch deployment tomorrow morning.

Best regards,
${agentName}`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi ${agentName},

Just a quick note to confirm that the delta sync is already showing results — I checked the Salesforce sync logs just now and the most recent run shows "modified: 12 records" rather than the usual "modified: 847 records." That is a huge reduction and confirms the change is working correctly.

I also subscribed to the status page RSS feed and forwarded the link to our IT manager and team lead. We should have been doing this from the start.

Regarding the account manager call: any time next Tuesday or Wednesday afternoon (after 2 PM UTC) works well for us. We have a few other topics we would like to discuss beyond this incident, including our upcoming contract renewal and the possibility of adding more agent seats as we are planning to grow the support team.

One small thing I noticed this afternoon that I am not sure is related to any of the above: when I filter the ticket list by "Category: Technical" AND "Status: Open," the result count shown in the header says "247 tickets" but only 200 rows are visible even after scrolling to the end and clicking "Load more" several times. Is this a display bug or a data issue? It is not urgent but I wanted to flag it since we are already in contact.

Also confirming: I have let our whole team know about the 6 AM UTC patch tomorrow. Two of our earliest-arriving agents (who start at 7 AM UTC) will do a quick smoke test as soon as they log in and report back to me.

Speak tomorrow,
${customerName}`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi ${customerName},

Excellent — glad the delta sync is immediately visible in the numbers. A reduction from 847 to 12 modified records per run is a very healthy result and confirms the integration is now only writing when there is something to write.

On the filter count discrepancy (247 shown, 200 loaded): this is a known display bug introduced in v2.13 where the count header uses a cached aggregation that does not account for tickets deleted or recategorised between the time the page loads and the time the "Load more" requests are made. It is cosmetic — no data is actually missing, the 47 difference will typically be tickets that were reclassified or deleted since your session started. This is also targeted for a fix in a subsequent release (v2.15). I will link your account to that bug report so you receive a notification when it is patched.

I have booked a calendar invite for Tuesday the 14th at 2:30 PM UTC for the account manager call. Your account manager Sarah Chen will be joining and I have briefed her on this incident so she has full context for the conversation. The invite should arrive in your inbox within the hour.

For tomorrow morning's patch:
- Deploy window: 6:00 AM UTC, rolling restart, expected duration 8–12 minutes
- Your two early-arriving agents should have a fully normal experience by 7 AM UTC
- I will personally verify the index fix is active on your account by running a query plan check post-deploy and will update this ticket by 7:30 AM UTC

If anything looks off when your agents log in tomorrow, reply here and I will be watching.

See you on the other side of the patch,
${agentName}`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi ${agentName},

Good morning — patch day!

I have two reports from our early agents:

Agent 1 (logged in at 7:03 AM UTC): "Everything is loading fast. Ticket list came up in about 2 seconds. Search is quick. No errors at all."

Agent 2 (logged in at 7:11 AM UTC): "Noticeably faster than it has been for weeks. The global open tickets view loaded in 3 seconds — I remember it taking 45+ seconds recently."

I logged in myself at 7:20 AM UTC and can confirm: the ticket list, search, and reply editor are all performing excellently. The 9 AM peak has not arrived yet but I am very optimistic.

Calendar invite for Tuesday's call received and accepted. Sarah Chen is already a familiar name to us from our original onboarding, so that will be a comfortable conversation.

I also noticed the system banner at the top of the page this morning says "Maintenance complete — v2.14.3 deployed successfully." That is a nice touch; I did not know that banner existed.

One question while things are quiet: the read replica routing you enabled for our account — is this something that will remain permanently or is it a temporary mitigation that will be removed once the patch proves stable? I am asking because it has clearly been beneficial beyond just the peak hours problem and I would prefer it to stay if possible.

More to follow after 9 AM.
${customerName}`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi ${customerName},

Wonderful news — thank you for the early reports. Both agents' experiences are consistent with what I see on our end: your workspace's query plan is now using the correct composite index for the ticket list view, with query times dropping from 8–15 seconds (at peak) to 180–350 milliseconds. That is a roughly 40x improvement on the most-used endpoint.

To answer your question about the read replica routing: yes, it will remain permanently active for your account. Once enabled for a workspace of your size it is not something we roll back — it is genuinely the right configuration for any account with more than 30,000 tickets. Think of the original setup as a default that is optimised for smaller workspaces. I have also added a note to your account profile so that any future infrastructure changes preserve this setting.

I ran the query plan check as promised and can confirm the index is being used correctly post-patch. Here is what changed:

Before patch: Sequential scan on tickets table (47,000 rows, estimated cost 9.2 seconds)
After patch: Index scan using idx_tickets_status_created_at (estimated cost 0.18 seconds)

That 51x cost reduction is why your agents are seeing such a dramatic difference.

I will continue monitoring your account through the 9 AM peak and will update this ticket by 10:30 AM UTC with the peak-hour results.

Great teamwork on this one — your detailed logs and responsive communication made the investigation significantly faster.

Best regards,
${agentName}`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi ${agentName},

Peak hour update: it is now 10:15 AM our time (9:15 AM UTC) and I can confidently say this has been the smoothest morning in at least three weeks.

Full team report for the 9–10 AM window:
- Zero timeout errors reported across all 35 agents
- No 504 or 503 errors visible in any browser console (I spot-checked four machines)
- The global open tickets view loaded in 2–3 seconds consistently
- Search results returning in under 3 seconds even for broad queries
- Reply submission is instantaneous from the user's perspective

The replication lag we discussed is barely noticeable — one agent mentioned seeing the status update after about 1 second on one occasion, but they already knew to expect it and it did not slow their workflow.

Salesforce sync logs show clean delta runs: this morning's 9 AM sync modified 34 records (which is accurate — we had 34 ticket status changes between 8:55 and 9:00 AM). No noise, no full rewrites.

I think we can call this resolved. The combination of the index patch, the read replica routing, the delta sync, and the workflow change to default personal queues has transformed the experience. I genuinely appreciate how thoroughly this was handled.

Could you please prepare a brief summary of all the changes made to our account? I would like to include it in our internal incident post-mortem. No rush — end of the week is fine.

Thank you so much,
${customerName}`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi ${customerName},

This is a brilliant result — thank you for the comprehensive peak-hour report. The data you have shared perfectly mirrors what I see in our server-side metrics: your account's average query response time during the 9–10 AM UTC window dropped from a mean of 11.4 seconds (last week) to 0.31 seconds this morning. Peak concurrent queries that were previously queuing and timing out are now completing well within the 30-second client timeout.

As requested, here is the full summary of changes made to your account during this incident:

Account Changes Summary — Ticket #294

1. Read Replica Query Routing (applied Wednesday, permanent)
   All ticket list and search queries now route to a read replica database rather than the primary. This reduces primary database load and improves list view performance for large workspaces. Replication lag is 200–2000ms at peak (cosmetic only).

2. Salesforce Integration: Delta Sync (applied Wednesday, permanent)
   The CRM sync was reconfigured to transmit only changed fields rather than all fields on every run. Write operations reduced from ~850/run to ~10–50/run depending on activity. Sync frequency (5-minute interval) unchanged.

3. Salesforce Sync Offset Timing (applied Wednesday, permanent)
   Sync schedule offset from :00/:05/:10 to :03/:08/:13 to reduce collision with peak query periods.

4. v2.14.3 Index Patch (applied Thursday via platform-wide deploy, permanent)
   Restored correct query plan usage of composite index idx_tickets_status_created_at. Query cost reduced 51x for status-filtered ticket list views.

5. Workflow Recommendation (adopted by customer team, no system change)
   Agents defaulted to personal "My open tickets" view rather than global view. Estimated 40% reduction in peak query load from this change alone.

I will mark this ticket as resolved. See you Tuesday for the account call.

Best regards,
${agentName}`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi ${agentName},

Thank you for that clean summary — it is exactly what I needed for the post-mortem. I have already pasted it into our incident report document.

Before we close out, I wanted to share one more piece of feedback that I think is worth raising. This incident was ultimately resolved very effectively, but it took us two weeks from the first symptoms until we raised a formal ticket. During that time, our agents were experiencing daily disruptions but we assumed it was a temporary blip or a local issue. We did not know about the status page, we had no proactive notification, and we had no clear threshold in our own processes for "this is bad enough to contact support."

I am raising this not as a complaint but as constructive feedback for your team:

1. The v2.14 regression should have triggered an automated alert for affected accounts. If your monitoring detected elevated 504 rates on the /api/tickets endpoint for specific account segments, a proactive email to those accounts would have saved everyone two weeks.

2. Your onboarding materials should prominently feature the status page and explain how to subscribe. We only learned about it during this ticket.

3. It might be worth reaching out proactively to other large-workspace accounts (say, >30,000 tickets) to ensure they also have the read replica routing and delta sync optimisations applied, since they would benefit from the same changes even without experiencing the problem first.

I realise you as an individual support agent cannot implement all of this, but I hope the feedback reaches your product and operations teams. I will also raise it during Tuesday's call with Sarah.

This has been an excellent support experience once we were in it. Thank you.

${customerName}`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi ${customerName},

Thank you for this feedback — it is genuinely valuable and I want you to know I take it seriously. You are right on all three points and I will not just pass it along; I am going to write it up as a formal internal improvement proposal.

On your specific points:

1. Proactive alerting for affected accounts: We do have anomaly detection on 5xx rates by account, but the threshold for triggering a customer notification was set conservatively high to avoid alert fatigue. What you experienced suggests the threshold needs to be lower, or we need a smarter signal (e.g., sustained elevated error rates during business hours for accounts above a certain ticket volume). I will propose this to our on-call engineering team this week.

2. Status page visibility in onboarding: This is a gap I have personally noticed before and it is embarrassing that it took an incident like this for your team to discover it. I am raising it with our onboarding team today as a high-priority documentation fix.

3. Proactive workspace optimisation for large accounts: This is perhaps the most impactful suggestion. We have roughly 200 accounts in your size bracket. Many of them are likely running on the default configuration that is suboptimal for large datasets. I am going to propose a one-time proactive optimisation sweep. This is exactly the kind of thing an account management team should be doing but we need better internal tooling to identify and action it systematically.

I am going to document all of this in our internal retrospective linked to this ticket. Your experience will genuinely help other customers who have not yet raised a ticket about the same silent pain.

I will see you and Sarah on Tuesday. This has been one of the most thorough and productive support interactions I have had in a long time — thank you for your patience and your detail.

Best regards,
${agentName}`,
  },
  {
    senderType: SenderType.customer,
    body: `Hi ${agentName},

I just wanted to send a brief note ahead of Tuesday's call.

Since Thursday's patch we have now had four full business days of clean operation. Zero timeouts, zero 504 errors, and the morning peak hours have been completely smooth across all 35 agents. The performance improvements have actually improved morale on the support floor — the team had become accustomed to the slow start to the morning and were workarounding it (e.g., some agents were starting with email tasks before 9 AM to avoid the system), and now they no longer need to.

A few metrics from our end over the past four days:
- Average ticket resolution time improved by ~18 minutes per agent per day (we attribute roughly half of this to the workflow change and half to the system performance improvement)
- Agent-reported satisfaction with tooling improved in our weekly internal pulse survey (we run a simple 1–5 rating; it went from 2.8 to 4.1 this week)
- No escalations from agents to team leads about system issues, which is the first such week in over a month

I am sharing these not to pat everyone on the back but because I think quantified outcomes are useful for your internal retrospective and business case for the improvements you mentioned proposing.

For Tuesday's call, beyond the contract renewal discussion, I would specifically like to talk about:
- SLA terms for large-workspace accounts
- Whether there is a dedicated support tier that includes proactive monitoring
- Our seat expansion plans for Q3

See you Tuesday.
${customerName}`,
  },
  {
    senderType: SenderType.agent,
    body: `Hi ${customerName},

Thank you for these outcome metrics — they are exactly what I asked for in my internal proposal and you have delivered them better than I could have hoped. The jump from 2.8 to 4.1 on agent tooling satisfaction in a single week is a particularly striking number and I have already included it in the retrospective document.

I have briefed Sarah Chen in full for Tuesday's call and shared this entire ticket thread as context. She is well-prepared on the SLA discussion, the proactive monitoring tier question, and your Q3 seat expansion plans.

Before we meet on Tuesday I wanted to close out a few loose ends:

1. Bug report linkage: I have linked your account to the v2.15 fix ticket for the filter count display bug (247 shown vs 200 loaded). You will receive an automatic notification when that fix is deployed, likely in two to three weeks.

2. Proactive optimisation sweep: I am happy to report that the proposal was approved by our infrastructure lead yesterday. We will be reaching out to the ~200 large-workspace accounts to apply the read replica routing and delta sync optimisations. Your feedback directly drove this decision and I wanted you to know that.

3. Status page subscription confirmation: I can see from our records that three users on your account are now subscribed to status page email notifications. Good.

4. This ticket: I will formally mark it resolved after our Tuesday call, so we can note any further actions from that discussion in the same record.

Looking forward to Tuesday.

Best regards,
${agentName}`,
  },
];

const existing = await prisma.reply.count({ where: { ticketId: TICKET_ID } });
if (existing > 0) {
  console.log(`Ticket ${TICKET_ID} already has ${existing} replies. Deleting and re-seeding...`);
  await prisma.reply.deleteMany({ where: { ticketId: TICKET_ID } });
}

let createdAt = new Date(Date.now() - replies.length * 4 * 60 * 60 * 1000);

for (const reply of replies) {
  await prisma.reply.create({
    data: {
      ticketId: TICKET_ID,
      body: reply.body,
      senderType: reply.senderType,
      userId: reply.senderType === SenderType.agent ? agent.id : null,
      createdAt,
    },
  });
  createdAt = new Date(createdAt.getTime() + 4 * 60 * 60 * 1000);
}

console.log(`Created ${replies.length} replies for ticket ${TICKET_ID}.`);
console.log(`Customer: ${customerName} | Agent: ${agentName} (${agent.id})`);
await prisma.$disconnect();
