# Three.js Skills for Claude Code

A curated collection of Three.js skill files that provide Claude Code with foundational knowledge for creating 3D elements and interactive experiences.

## Purpose

When working with Three.js, Claude Code starts with general programming knowledge but lacks specific Three.js API details, best practices, and common patterns. These skill files bridge that gap by providing:

- Accurate API references and constructor signatures
- Working code examples for common use cases
- Performance optimization tips
- Integration patterns between different Three.js systems

## Installation

The skills live in `.claude/skills/<skill-name>/SKILL.md`, which is the location Claude Code scans for project skills.

**Option 1: work inside this repository (simplest, works from a phone).**
Open a Claude Code session on this repository (for example at [claude.ai/code](https://claude.ai/code)). All skills are discovered automatically when the session starts.

**Option 2: use the skills in another project.**
Copy the `.claude/skills` directory into the root of that project:

```bash
git clone https://github.com/Penguin116677/threejs-skills.git
mkdir -p your-project/.claude
cp -r threejs-skills/.claude/skills your-project/.claude/
```

**Option 3: make them available in every project on your machine.**
Copy the skill folders into your personal skills directory:

```bash
mkdir -p ~/.claude/skills
cp -r threejs-skills/.claude/skills/* ~/.claude/skills/
```

Skills are loaded when a session starts. Start a new session after adding them.

## Skills Included

| Skill                      | Description                                                             |
| -------------------------- | ----------------------------------------------------------------------- |
| **threejs-fundamentals**   | Scene setup, cameras, renderer, Object3D hierarchy, coordinate systems  |
| **threejs-geometry**       | Built-in shapes, BufferGeometry, custom geometry, instancing            |
| **threejs-materials**      | PBR materials, basic/phong/standard materials, shader materials         |
| **threejs-lighting**       | Light types, shadows, environment lighting, light helpers               |
| **threejs-textures**       | Texture types, UV mapping, environment maps, render targets             |
| **threejs-animation**      | Keyframe animation, skeletal animation, morph targets, animation mixing |
| **threejs-loaders**        | GLTF/GLB loading, texture loading, async patterns, caching              |
| **threejs-shaders**        | GLSL basics, ShaderMaterial, uniforms, custom effects                   |
| **threejs-postprocessing** | EffectComposer, bloom, DOF, screen effects, custom passes               |
| **threejs-interaction**    | Raycasting, camera controls, mouse/touch input, object selection        |
| **threejs-particles-cinematic** | Glowing particles, curl-noise flow, GPGPU simulation, mesh-surface sampling, shape morphing, trails + bloom |
| **threejs-product-motion** | Product studio lighting, auto-framing, deterministic timelines, camera moves, hero shots, social formats, video export |

## How It Works

Claude Code automatically loads skill files from the `.claude/skills` directory when they match the context of your request. When you ask Claude Code to:

- Create a 3D scene → `threejs-fundamentals` is loaded
- Add lighting and shadows → `threejs-lighting` is loaded
- Load a GLTF model → `threejs-loaders` is loaded
- Create custom visual effects → `threejs-shaders` and `threejs-postprocessing` are loaded
- Make a cinematic particle effect → `threejs-particles-cinematic` is loaded
- Animate a product reveal or export a video → `threejs-product-motion` is loaded

You can also name a skill explicitly, e.g. "use the threejs-product-motion skill to ...".

## Usage Examples

### Basic Scene Setup

Ask Claude Code:

> "Create a basic Three.js scene with a rotating cube"

Claude Code will use `threejs-fundamentals` to generate accurate boilerplate with proper renderer setup, animation loop, and resize handling.

### Loading 3D Models

Ask Claude Code:

> "Load a GLTF model with Draco compression and play its animations"

Claude Code will use `threejs-loaders` and `threejs-animation` to generate code with proper loader configuration, animation mixer setup, and error handling.

### Custom Shaders

Ask Claude Code:

> "Create a custom shader material with a fresnel effect"

Claude Code will use `threejs-shaders` to generate working GLSL code with proper uniform declarations and coordinate space handling.

### Cinematic Particles

Ask Claude Code:

> "Create 50k glowing particles that swirl with curl noise and then assemble into the shape of my product.glb, with bloom"

Claude Code will use `threejs-particles-cinematic` (GPGPU flow, `MeshSurfaceSampler`, morphing) together with `threejs-postprocessing`.

### Product Commercial

Ask Claude Code:

> "Make an 8-second 9:16 product reveal for product.glb: rise from darkness, orbit camera, light sweep, then let me record it as a video"

Claude Code will use `threejs-product-motion` for studio lighting, auto-framing, the timeline, camera moves, and the `MediaRecorder` export.

## Skill File Structure

Each skill lives in its own folder, `.claude/skills/<skill-name>/SKILL.md`, and the folder name must match the `name` field. Each skill file follows a consistent format:

```markdown
---
name: skill-name
description: When this skill should be activated
---

# Skill Title

## Quick Start

[Minimal working example]

## Core Concepts

[Detailed API documentation with examples]

## Common Patterns

[Real-world usage patterns]

## Performance Tips

[Optimization guidance]

## See Also

[Related skills]
```

## Verification

These skills have been audited against the official Three.js documentation (r160+) for:

- Correct class names and constructor signatures
- Valid property names and method signatures
- Accurate import paths (`three/addons/` format)
- Working code examples
- Current best practices

## Contributing

Found an error or want to add coverage for additional Three.js features?

1. Fork the repository
2. Edit or create skill files in `.claude/skills/<skill-name>/SKILL.md`
3. Verify against [Three.js documentation](https://threejs.org/docs/)
4. Submit a pull request

### Skill File Guidelines

- Use accurate, tested code examples
- Include both simple and advanced patterns
- Document performance implications
- Cross-reference related skills
- Keep examples concise but complete

## License

MIT License - Feel free to use, modify, and distribute.

## Acknowledgments

- [Three.js](https://threejs.org/) - The 3D library these skills document
