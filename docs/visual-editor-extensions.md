# Visual Editor Tools for Local Dev Environments

## 1. VS Code Extensions

| Extension | Description | Open Source |
|-----------|-------------|-------------|
| **Microsoft Live Preview** | In-editor live preview panel for HTML pages | Yes |
| **Live Server** (Ritwick Dey) | Local dev server with live reload | Yes |
| **SculptUI - React** | Visually edit React component styles from the browser, writes back to source | Yes |
| **Fusion** (Builder.io) | AI-powered visual canvas inside VS Code, Figma import, generates PRs | No |
| **HTML WYSIWYG Designer Addon** | Graphical drag-and-drop HTML designer in VS Code | Yes |
| **waiVSCode** | WYSIWYG HTML editor inside VS Code | Yes |
| **HTML Preview Pro** | Live HTML preview with responsive device simulation | Yes |

## 2. Local-First Visual Editors for React/Next.js

| Tool | Description | Open Source | URL |
|------|-------------|-------------|-----|
| **Onlook** | Desktop app - visual editor for running React/Next.js + Tailwind apps, writes to source files | Yes | [onlook.com](https://onlook.com) |
| **Puck** | Self-hosted drag-and-drop page editor using your own React components | Yes (MIT) | [puckeditor.com](https://puckeditor.com) |
| **Craft.js** | React framework for building custom drag-and-drop page editors | Yes (MIT) | [craft.js.org](https://craft.js.org) |
| **Easyblocks** | Toolkit for building custom visual builders with React | Yes | [easyblocks.io](https://easyblocks.io) |
| **Framely** | Drag-and-drop website editor built with Next.js 14 | Yes (MIT) | [GitHub](https://github.com/belastrittmatter/Framely) |
| **Blocks UI** | JSX-based page builder that outputs production React code | Yes | [blocks-ui.com](https://blocks-ui.com) |
| **Build-UI** | Library for building site builders on top of React components | Yes | [GitHub](https://github.com/LuisMPS/build-ui) |
| **ui-builder** | No-code UI builder compatible with shadcn/ui | Yes | [GitHub](https://github.com/olliethedev/ui-builder) |

## 3. Web Builder Frameworks (Self-Hosted)

| Tool | Description | Open Source | URL |
|------|-------------|-------------|-----|
| **GrapesJS** | Full-featured drag-and-drop HTML builder framework, embeddable, React wrapper available | Yes (BSD) | [grapesjs.com](https://grapesjs.com) |
| **Webstudio** | Open-source Webflow alternative, full CSS control, self-hostable | Yes (AGPL) | [webstudio.is](https://webstudio.is) |

## 4. Component Development & Testing

| Tool | Description | Open Source | URL |
|------|-------------|-------------|-----|
| **Storybook** | Component workshop - build, test, and document UI in isolation | Yes (MIT) | [storybook.js.org](https://storybook.js.org) |
| **Playroom** (SEEK) | Multi-theme, multi-viewport JSX prototyping with your own components | Yes (MIT) | [GitHub](https://github.com/seek-oss/playroom) |

## 5. Design-to-Code / Figma Integration

| Tool | Description | Open Source | URL |
|------|-------------|-------------|-----|
| **Figma MCP Server** (Official) | Connects Figma design context to AI coding tools locally | Protocol open | [Figma Docs](https://developers.figma.com/docs/figma-mcp-server/) |
| **Framelink MCP** | Community alternative Figma MCP server for AI agents | Yes | [GitHub](https://github.com/GLips/Figma-Context-MCP) |
| **FigmaToCode** | Figma plugin generating React, HTML, Tailwind, Flutter, SwiftUI | Yes | [GitHub](https://github.com/bernaferrari/FigmaToCode) |
| **Visual Copilot** (Builder.io) | AI Figma-to-code for React/Vue/Svelte/Angular | Compiler (Mitosis) is OSS | [builder.io](https://www.builder.io/blog/figma-to-code-visual-copilot) |
| **Mitosis** (Builder.io) | Write JSX once, compile to React/Vue/Angular/Svelte/Solid/etc. | Yes (MIT) | [GitHub](https://github.com/BuilderIO/mitosis) |
| **Figma Make** | Figma's built-in AI design-to-code (HTML/CSS/JS) | No | [figma.com](https://www.figma.com/solutions/design-to-code/) |

## 6. Visual CMS with Local Preview

| Tool | Description | Open Source | URL |
|------|-------------|-------------|-----|
| **Plasmic** | Visual builder + CMS for React, drag-and-drop with Figma-like freedom | SDK is OSS | [plasmic.app](https://www.plasmic.app) |
| **Builder.io** | Headless visual CMS, drag-and-drop with your React components | SDKs are OSS | [builder.io](https://www.builder.io) |
| **Sanity Studio** | Headless CMS with real-time visual editing overlays on Next.js localhost | Studio is OSS | [sanity.io](https://www.sanity.io/docs/visual-editing) |
| **TeleportHQ** | Browser-based drag-and-drop React builder with code export | Generators OSS | [teleporthq.io](https://teleporthq.io) |

## Key Recommendations by Use Case

- **Edit running React app visually** → Onlook (closest to Dev Editor's approach)
- **Build a custom page editor** → Puck or Craft.js
- **Embeddable HTML builder** → GrapesJS
- **Component development** → Storybook
- **Figma-to-code pipeline** → Figma MCP Server + FigmaToCode
- **Open-source Webflow alternative** → Webstudio
- **VS Code visual editing** → SculptUI (React) or Fusion (AI-powered)
- **Write once, multi-framework** → Mitosis

## How Dev Editor Differs

Dev Editor takes a unique approach compared to the tools above:

| Aspect | Dev Editor | Webflow | Onlook | GrapesJS |
|--------|-----------|---------|--------|----------|
| **Layout** | Three-column: Left (Layers) + Center (Preview) + Right (Style) | Three-column (same pattern) | Single canvas + side panel | Single canvas + panels |
| **Architecture** | Next.js web app with iframe proxy, Bun runtime | Cloud SaaS | Electron desktop app | Embeddable JS library |
| **Theme** | Dark mode only | Dark mode | Dark mode | Light/dark |
| **Target** | Any localhost dev server | Webflow sites only | React + Tailwind only | Static HTML |
| **DOM Access** | Reverse proxy + injected inspector | Direct (own renderer) | Custom browser engine | Direct DOM |
| **Claude Integration** | Built-in via API routes | None | None | None |
| **Output** | Changelog + automated code diffs | Hosted site / code export | Direct source file edits | HTML/CSS export |
| **Install** | `bun dev` | Browser (SaaS) | Desktop app install | npm package |

## Curated Resource

[awesome-react-visual-editors](https://github.com/JPrisk/awesome-react-visual-editors) - actively maintained list
