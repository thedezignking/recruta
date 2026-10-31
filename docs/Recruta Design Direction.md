# Recruta design direction

Updated October 27, 2026.

## Purpose

Give recruiters a calm, useful workspace for opening jobs and reviewing applicants. The latest supplied reference sets the surface direction: light neutral surfaces, a restrained sidebar, a white work area, subtle borders, and clear typography. The recruitment references inform the density and hierarchy of job and applicant information. The application fills the browser edge to edge.

## Surface and type

- Outer canvas and sidebar: neutral `#F5F5F5`.
- Work area and cards: `#FFFFFF`.
- Ink: `#17182B`.
- Border: `#E8E8E8`.
- Selected navigation: `#EAEAEA` with dark text and a brand-purple solid icon; inactive icons stay Linear. Keep broad surfaces, hover treatments, and menu selections neutral.
- Secondary text: `#686978`.
- Brand accent: `#5C5AED`.
- Geist Sans for the interface; Geist Mono for operational metadata when useful.
- Content surfaces use a 10 px radius; controls and navigation use 6 px, and compact nested elements use 4 px. The shared radius base is 6 px. Circular avatars and status dots remain circular. The application shell has no outer rounded frame, padding, or border.
- Brand signature: a flat charcoal (#272A32) rounded square with an off-white (#F4F7F2) abstract fit symbol formed by two complementary corners. The 40-unit SVG has a 10-unit corner radius and renders at 28 px beside a 22 px semibold Geist wordmark with a 10 px gap. The same vector supplies the favicon. No gradients, 3D effects, or bitmap-dependent wordmarks; previous supplied artwork remains legacy only. Never stretch the square mark.

## Workspace shell

The 208 px desktop sidebar fills the viewport height and contains the active agency identity and switcher, recruiter workflow navigation, and the separate single-line user profile control anchored at the bottom. It can collapse to 60 px while retaining accessible names. The white work area reaches the browser edges. A 56 px toolbar carries the current destination as the page title (a Parent › Record breadcrumb on detail pages), a boxed notification bell, and workspace search. Page actions such as New job sit in the first section header of the page, beside its range control. Do not repeat the destination title as a large content hero. Mobile keeps the main four destinations in a bottom bar and exposes the complete navigation through a menu.

Do not add controls that only imply functionality. Search, notifications, workspace switching, and AI chat should appear when their underlying workflows are available.

The sidebar uses the reference's neutral #F8F8F8 surface. Its 56 px top row is a flat workspace selector with the active agency name in dark text, a 24 px public agency logo or purple initial placeholder, and a small dark up/down switcher glyph. Evenkore's purple fit-symbol artwork is a local logo assigned to that agency, not the generic fallback. One compact recruiter navigation list follows with no group labels or internal dividing lines. Team and Agency settings move to the role-gated profile menu. The selected row uses a white surface and dark solid icon. The default Recruta 28/22 px lockup remains available outside the shell. The workspace menu shows active workspaces, the current selection and membership role, then Create workspace. The same selector remains available when collapsed and on mobile. Selection triggers a full navigation so previous-workspace UI state is discarded. The user avatar and name occupy one bordered row at the bottom with a command glyph at the end; role and workspace remain in the opened menu.

Do not repeat a visible “Workspace” heading below the agency identity. The account menu opens from the sidebar profile row on desktop and the header avatar on mobile. Group the sidebar with spacing while preserving accessible navigation names. Reserve filled primary buttons for the page's main action or a form's main submission. Supporting and repeated CTAs use the shared outline variant, not filled secondary; this includes empty states and alternate Save draft actions. The public job page has one Apply action, which opens the application modal. Keep lightweight navigation ghost/link and destructive actions semantically destructive.

## Overview hierarchy

1. The desktop toolbar holds Overview, a boxed notification bell, and workspace search in that order. New job sits with the date-range control in the Hiring activity section header. The profile menu is at the foot of the desktop sidebar and in the mobile header. Mobile places New job with its page title. Hiring activity uses a smaller heading than Overview; a compact 28 px high pill range control uses abbreviated visible labels and sits above the metric strip. Metric cells do not change background on hover. Omit the greeting. Collapsed sidebar labels appear only on hover or keyboard focus and reset when the sidebar is toggled.
2. A bordered strip has four distinct cells ordered Active jobs, Applications received, In review, Shortlisted. Each shows its existing exact count, destination link, and an eight-interval dot chart based on actual intake dates. The compact range control shows All, 24h, 7d, 14d, and 30d while preserving full accessible names. Hovering or focusing a chart interval reveals its exact count and date span. In review uses a document icon. All spans the full recorded history in both the headline count and chart; the small metric separately reports last-30-days intake.
3. A compact Needs attention preview appears only for real exceptions and sits before normal work. Each row pairs a Solar Linear icon with semantic color: amber for overdue review, red for failed processing or delivery. The short issue label carries the signal; the candidate and job details are secondary. Rows link directly to the application and additional items remain available in the full queue. There is no permanent Up next card or empty attention panel.
4. An application inbox previews the five oldest received/in-review submissions, with the actual outstanding count. Hide it until a job has been published or applications exist. A published role with no applications offers its direct copy-link action; an established empty inbox says no applications are waiting for review.
5. Active jobs show up to five currently open roles, independently of recent creation dates. An unfinished draft gets a contextual Continue draft action. A new owner's workspace gets one Start hiring panel explaining inline organization creation; an unassigned recruiter gets assignment-aware guidance. Established quiet workspaces get compact empty states.
6. Hiring requests appear only for owners, administrators, and recruitment managers when submitted, under-review, or approved requests need agency action. Omit converted requests and those waiting for client clarification. Remove the secondary column when it has no content. Optional requests remain discoverable in navigation.

The four summary cards and their existing filtering, links, order, and zero values remain unchanged, including during first use. Conditional behavior applies only below the summary row. Never infer a new agency from a summary period that has no results; use unfiltered, authorized job/application history. Loading errors must not become empty states.

## New job flow

Job setup is a centered, four-step modal over Jobs: Essentials (organization, title, and openings), Role details (description, engagement, location, arrangement, and deadline), Hiring setup (optional requirements, screening questions, and assignment), then Review (the candidate-facing job and application preview). At a wide desktop viewport the modal is about 940 × 760 px, with a 275 px light neutral left rail and a white right pane. Follow the reference's step list, progress header, softly tinted inset cards with white input rows, scrolling content pane, and footer actions fixed at the bottom of the right pane. Show one stage at a time, keep optional requirements and screening questions collapsed until needed, preserve entries when moving back, allow a draft after the role description is valid, and place the publish action only after the preview. Validation returns to the stage containing the error. Closing returns to Jobs. The former `/app/jobs/new` URL resolves to the same modal for existing links. Saved organization selection has a clear selected state and displays its configured logo; search status copy appears only when there is something to report.

Jobs uses the top toolbar for its page title and places its primary New job action with the range control in the Job activity section header, exactly as Overview does. Below it, the shared Overview metric strip renders four operational measures from the reference: open jobs, positions to fill across open jobs, open jobs due in seven days, and filled jobs. The selected rolling window or full history groups current job status by creation date; the same compact time tabs, semantic change line, and interactive dotted chart treatment apply. List status counts remain all-time. Strong status tabs, title search, and a real deadline/recruiter filter control narrow the list server-side. Rows combine a role icon and metadata, organization identity, lead recruiter, applicant and opening counts, actual reviewed/total application progress, deadline, semantic status, and a chevron. Clicking a job opens a right-side panel with its actual description, details, application stage counts, and configured workflow; the full job page remains the destination for mutations. A secondary sidebar group places role-gated Team and Settings below workflow destinations, separated by a faint divider without a group label. The larger two-line personal profile control stays anchored at the sidebar foot.

All production content comes from the active agency. Mini charts use exact tenant-authorized counts and never synthetic data. Do not add invented growth percentages, interviews, placements, or automation counts. Empty states explain the next useful action.

Ranges are rolling elapsed-time windows: applications use received dates and jobs use created dates, evaluated at their current status. In review includes only submissions explicitly moved into review; Shortlisted includes only the current shortlisted stage. These are application counts, not unique candidates. Work queues and next actions remain all-time, preventing older outstanding work from disappearing. Stage-card links open the corresponding filtered inbox. Confirmed placements should replace a card only when placement confirmation is implemented.

The top identity is the active agency workspace; its switcher menu uses logo-or-initial rows with a membership-role subline and a clear check on the selected workspace, followed by Create workspace. The bottom identity is the signed-in person; its compact 208 px menu groups the avatar, name, current-workspace role badge, email, and personal account actions in a quiet inset panel. Role-gated Team and Agency settings, public careers, and separated destructive logout follow. Do not repeat the workspace name in the personal menu or mix personal actions into the switcher. Workspace, profile, mobile navigation, and notification popovers are mutually exclusive; opening one closes the previous one. These popovers stay compact while preserving readable long text. Do not add nonfunctional theme, billing, or support controls just to match a reference.

## Interface copy

Use short labels and show descriptions only when they add information needed to complete a task. Omit taglines, repeated page-title explanations, generic motivational copy, and implementation details. Keep field labels, validation errors, consent, upload limits, permission guidance, destructive-action consequences, and meaningful record metadata. Empty states need at most one useful sentence and an action.

## Next organization-entry enhancement

Use company autocomplete in both organization entry points. Search results show name, logo, website, and location. Choosing a result prefills available company information for review and editing. Existing agency organizations appear first; external results follow. Always provide a manual-entry path for an unlisted company or an unavailable lookup service. Search and selection never save a record until the recruiter confirms it.

## Icon and interaction rules

- Solar Linear for routine actions, metadata, and inactive sidebar navigation.
- Solar Bold solid for selected navigation, identity, and major empty states.
- No duotone variants; ordinary add actions use the plain Add icon.
- Navigation and standalone toolbar icons use 20 px; compact actions and metadata use 16 px, with 18 px allowed inside search inputs. Linear strokes use approximately 1.6 px. Keep hit areas independent of glyph size.
- Decorative icons are hidden from assistive technology. Icon-only controls have a name and tooltip.
- Use actual links for navigation and buttons for actions.
- Keep focus visible and honor reduced motion.
- Password fields provide a keyboard-accessible show/hide toggle without altering the value or submitting the form.
- Use the shared card, table, button, empty-state, menu, and page-header primitives so the treatment stays consistent across product screens.

## Verification

Review both populated and empty workspaces at desktop and mobile sizes. Check long names, horizontal table overflow, collapsed navigation, mobile access to all destinations, role-restricted controls, contrast, and keyboard operation. Synthetic data may be used only in isolated verification fixtures.
