# Recruta design direction

Updated October 25, 2026.

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
- Brand signature: a flat near-black (#111111) rounded square with a white abstract fit symbol formed by two complementary corners. The 40-unit SVG has an 8-unit corner radius and renders at 28 px beside a 22 px semibold Geist wordmark with a 10 px gap. The same vector supplies the favicon. No gradients, 3D effects, or bitmap-dependent wordmarks; previous supplied artwork remains legacy only. Never stretch the square mark.

## Workspace shell

The desktop sidebar fills the viewport height and contains the product identity, agency identity, core navigation, role-restricted administration, and the signed-in user. It can collapse while retaining accessible names. The white work area reaches the browser edges. Main sections have no breadcrumbs. Page actions belong beside their page title; New job appears beside Overview and on the Jobs page, not globally in the top bar. Mobile keeps the main four destinations in a bottom bar and exposes the complete navigation through a menu.

Do not add controls that only imply functionality. Search, notifications, workspace switching, and AI chat should appear when their underlying workflows are available.

The sidebar now uses a smaller lockup: 24 px mark, 20 px wordmark, 8 px gap, within a 64 px brand row. The default 28/22 px lockup remains available outside the shell. Below it, a 36 px white outlined workspace selector uses a 20 px neutral initial, truncated name, and a small chevron. Its menu shows active workspaces, the current selection and membership role, then Create workspace. The same selector remains available when collapsed and on mobile. Selection triggers a full navigation so previous-workspace UI state is discarded.

Do not repeat a visible “Workspace” heading below the agency identity or add a divider above the account menu. Group the sidebar with spacing while preserving accessible navigation names. Reserve filled primary buttons for the page's main action or a form's main submission. Supporting and repeated CTAs use the shared outline variant, not filled secondary; this includes empty states, alternate Save draft actions, and repeated public Apply links. Keep lightweight navigation ghost/link and destructive actions semantically destructive.

## Overview hierarchy

1. Page title, content-width date-range select (Last 30 days by default), and New job action share the header. On small screens actions sit together below the title. Omit the greeting. Collapsed sidebar labels appear only on hover or keyboard focus and reset when the sidebar is toggled.
2. Independent summary cards ordered Active jobs, Applications received, In review, Shortlisted. Each has its own boundary and visible space around it. The select offers All time, Last 24 hours, Last 7 days, Last 14 days, and Last 30 days. In review uses a document icon.
3. A Needs attention section appears only for real exceptions and sits before normal work. There is no permanent Up next card or empty attention panel.
4. An application inbox previews the five oldest received/in-review submissions, with the actual outstanding count. Hide it until a job has been published or applications exist. A published role with no applications offers its direct copy-link action; an established empty inbox says no applications are waiting for review.
5. Active jobs show up to five currently open roles, independently of recent creation dates. An unfinished draft gets a contextual Continue draft action. A new owner's workspace gets one Start hiring panel explaining inline organization creation; an unassigned recruiter gets assignment-aware guidance. Established quiet workspaces get compact empty states.
6. Hiring requests appear only for owners, administrators, and recruitment managers when submitted, under-review, or approved requests need agency action. Omit converted requests and those waiting for client clarification. Remove the secondary column when it has no content. Optional requests remain discoverable in navigation.

The four summary cards and their existing filtering, links, order, and zero values remain unchanged, including during first use. Conditional behavior applies only below the summary row. Never infer a new agency from a summary period that has no results; use unfiltered, authorized job/application history. Loading errors must not become empty states.

All production content comes from the active agency. Do not fill the dashboard with synthetic charts, growth percentages, interviews, placements, or automation counts. Empty states explain the next useful action.

Ranges are rolling elapsed-time windows: applications use received dates and jobs use created dates, evaluated at their current status. In review includes only submissions explicitly moved into review; Shortlisted includes only the current shortlisted stage. These are application counts, not unique candidates. Work queues and next actions remain all-time, preventing older outstanding work from disappearing. Stage-card links open the corresponding filtered inbox. Confirmed placements should replace a card only when placement confirmation is implemented.

The account row has a 56 px minimum height, a 12 px avatar/text gap, and distinct name/role lines. Its 288 px menu groups identity (name, email, workspace/role), personal account/security, shortcuts/public careers, and separated destructive logout. Keep menu rows comfortably spaced and contain long text within the viewport. Do not add nonfunctional theme, billing, or support controls just to match a reference.

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
