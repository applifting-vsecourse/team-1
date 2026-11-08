# Ilustrace

Ilustrace na landing page jsou z [unDraw](https://undraw.co) (balíček `undraw-svg`, licence MIT, © Evo Mark Ltd), převzaté beze změny tvarů. Barvy v SVG jsou přepsané na CSS proměnné z `styles/global.css` (`var(--primary)`, `var(--link)`, `var(--foreground)`, `var(--accent)`, `var(--border)`, `var(--muted)`, `var(--card)`), aby sledovaly světlý i tmavý vzhled. Zůstaly jen odstíny pleti postav.

Importují se jako komponenty: `import Camp from "@/assets/illustrations/camp.svg?react"`. Jsou dekorativní, vždy s `aria-hidden`.
