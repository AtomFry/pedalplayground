# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Workflow Instructions

### Interaction Logging Protocol

For every prompt interaction, follow this structured workflow:

#### 1. Create Prompt Directory Structure
- Create a new folder: `Claude/Prompt_YYYYMMDDHHMMSS/` 
- Use the current datetime for the suffix (e.g., `Claude/Prompt_20250816143022/`)
- This creates a sortable chronological history of all interactions

#### 2. Document the Prompt
- Save the user's prompt in: `Claude/Prompt_YYYYMMDDHHMMSS/prompt.md`
- Include the full, original prompt text

#### 3. Create and Save Work Plan
- Before starting any work, create a detailed plan
- Save the plan in: `Claude/Prompt_YYYYMMDDHHMMSS/plan.md`
- The plan should outline:
  - Understanding of the requirements
  - Approach and methodology
  - Key steps to be taken
  - Expected deliverables

#### 4. Complete Git Commit
- After completing all work for the prompt, create a local git commit
- Use the prompt ID as the commit message (e.g., "20250816143022")
- This ties the git history to the documented prompt history

#### Directory Structure Example
```
project-root/
├── Claude/
│   ├── Prompt_20250816143022/
│   │   ├── prompt.md
│   │   └── plan.md
│   ├── Prompt_20250816151445/
│   │   ├── prompt.md
│   │   └── plan.md
│   └── ...
└── [other project files]
```

#### Workflow Summary
1. **Log** → Create timestamped folder and save prompt
2. **Plan** → Create and document work plan
3. **Execute** → Perform the requested work
4. **Commit** → Stage modified files but do not commit so that user can do a code review and test prior to committing

This system ensures full traceability between prompts, plans, work performed, and git history.

## Project Overview

**Pedal Playground** is an interactive web application for planning guitar effects pedalboards. It allows guitarists to:

- **Visually arrange pedals** on virtual pedalboards with accurate scaling and dimensions
- **Browse thousands of pedals** from hundreds of manufacturers with real images and dimensions
- **Add custom pedals and pedalboards** with user-defined dimensions and colors
- **Save and load layouts** for different pedalboard configurations
- **Work with real measurements** using both inches and millimeters

### Technology Stack
- **Frontend**: Vanilla JavaScript, HTML5, CSS3/SCSS
- **Build Tools**: Gulp, Sass, npm scripts
- **UI Framework**: Bootstrap 3, Select2, jQuery
- **Data**: JSON files containing pedal and pedalboard specifications
- **Deployment**: Static site with browser-sync for development

### Key Features
- Drag-and-drop interface for pedal placement
- Accurate scaling based on real pedal dimensions
- Extensive database of guitar effect pedals with images
- Custom pedalboard and pedal creation tools
- Settings panel for units conversion and canvas scaling
- Export/import functionality for saving layouts

### Data Structure
- `public/data/pedals.json` - Database of all available pedals with dimensions and images
- `public/data/pedalboards.json` - Collection of available pedalboard sizes
- Images stored in `app/images/pedals/` (high-res) and `public/images/pedals/` (web-optimized)