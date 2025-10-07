# FUTODAMA Design Guidelines

## Design Approach: Modern Productivity System
**Selected Framework**: Linear-inspired design system with Material Design data visualization principles
**Rationale**: Combines sleek, professional aesthetics with robust data presentation capabilities. Linear's refined dark mode aesthetic pairs perfectly with Material's proven data visualization patterns for AI-powered analytics tools.

## Core Design Elements

### A. Color Palette
**Dark Mode Foundation**:
- Background Primary: 220 15% 8%
- Background Secondary: 220 15% 12%
- Background Elevated: 220 15% 16%
- Border Subtle: 220 15% 20%
- Border Emphasis: 220 15% 30%

**Brand & Accent Colors**:
- Primary (AI/Actions): 210 85% 60% (vibrant blue for intelligence)
- Success (Validated): 142 70% 50%
- Warning (Missing Fields): 35 90% 60%
- Error (Low Confidence): 0 75% 55%
- Neutral Text: 220 10% 85%

### B. Typography
**Font System**: Inter (Google Fonts)
- Headlines: 600 weight, 32-48px, tight tracking
- Subheads: 500 weight, 18-24px
- Body: 400 weight, 14-16px, 1.6 line-height
- Data/Metrics: 500 weight, tabular-nums for alignment
- Labels: 500 weight, 12px uppercase, tracking-wide

### C. Layout System
**Spacing Primitives**: Tailwind units of 2, 4, 6, 8, 12, 16
- Component padding: p-6 or p-8
- Section gaps: gap-6 or gap-8
- Card spacing: space-y-4
- Micro-spacing: gap-2 or gap-4

### D. Component Library

**Document Upload Zone**:
- Dashed border (border-dashed border-2) with hover state intensification
- Large dropzone area (min-h-64) with centered icon and instructional text
- Drag-active state: background shift to 220 15% 14% with border glow
- Supported formats badge list underneath

**Tabbed Navigation**:
- Horizontal tabs with bottom border indicator (h-0.5 transition-all)
- Active tab: primary color bottom border, text weight 500
- Inactive tabs: muted text (opacity-60), weight 400
- Tab content: fade-in transition (150ms ease)

**Split-View Layout** (60/40 ratio):
- Left: Document viewer with toolbar (zoom, page nav, download)
- Right: Extracted data panels with collapsible sections
- Resizable divider with drag handle (w-1 hover:w-2 transition)
- Document viewer: dark background with white document on elevated card

**Data Visualization Cards**:
- Elevated background (bg-secondary) with subtle border
- Header with icon, title, and confidence badge
- Key-value pairs in grid (grid-cols-2 gap-4)
- Missing field indicators: warning icon + dashed outline placeholder
- Confidence meters: horizontal progress bars with color gradients (0-60% error, 60-85% warning, 85-100% success)

**Alert System**:
- Missing Fields: Yellow-tinted card with warning icon, field count badge
- Low Confidence: Red-tinted with info icon, percentage display
- Suggestions: Blue-tinted with lightbulb icon, actionable text

**Batch Processing View**:
- Table layout with sortable columns (name, status, confidence, actions)
- Row selection checkboxes with bulk actions toolbar
- Status badges: processing (pulsing dot), complete (check), failed (x)
- Progress indicators: thin progress bars below each row

### E. Navigation & Structure
**Top Bar**: Full-width dark header (h-16) with logo left, tabs center, user menu right
**Sidebar**: Collapsible (w-64 expanded, w-16 collapsed) with icon-only mode
**Main Content**: max-w-screen-2xl mx-auto with appropriate padding (px-8)

## Images
**No Hero Image** - This is a utility application, not a marketing site. Focus remains on functional interfaces and data presentation.

**Product Screenshots**: Use within onboarding tooltips or empty states to guide users through complex workflows

**Illustrations**: Minimal line-art illustrations for empty states (no documents uploaded yet) in muted primary color

## Key Interactions
- Smooth page transitions (200ms ease-in-out)
- Hover elevations: cards lift 2px with shadow increase
- Loading states: skeleton screens matching content structure
- Success animations: subtle check mark expansion on completion
- Error shake: gentle horizontal shake for failed validations

## Accessibility
- All interactive elements: min 44px touch targets
- Focus indicators: 2px primary color outline with 2px offset
- Color-blind safe: Icons accompany all color-coded information
- Keyboard navigation: Tab order follows visual hierarchy
- Screen reader labels: Descriptive ARIA labels for all AI confidence scores