# a1: Quadratic Formula & Vertex Form (template topic)

Solves and visualises **ax² + bx + c = 0**, and writes the same parabola in vertex form **y = a(x − h)² + k** (flashcards A1.11 and A1.12):

$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

Start from standard, vertex or factored form. The animation draws the parabola and labels its discriminant, axis of symmetry, vertex, y-intercept and roots (real or complex). The step panels show how y = x² shifts, stretches and lifts into a(x − h)² + k, and work through completing the square and expanding back.

From one set of calculations this topic produces:

- **Interactive HTML**: a Manim-style animated page in the portfolio theme, with sliders, toggles and step-by-step working.
- **Manim video**: a real Manim render in the same theme.
- **API module + page**: published to GitHub Pages, so any site can call `solve()` or embed the page (see [general/README.md](https://github.com/ethan-gueck/portfolio-projects/tree/main/general#static-api-github-pages)).

Shared themes, CSS/JS, plotting, Manim helpers and the page builder live in [`general/`](https://github.com/ethan-gueck/portfolio-projects/tree/main/general). This folder holds only what is specific to quadratics.

## Layout

```
a1/
├── solver.py                # built on ../core/formula.py (A1.11): roots, text forms, plot window, solve(); shared with factoring/
├── forms.py                 # the page's calculations: quadratic formula steps, vertex form (A1.12), completing the square
├── animations/
│   ├── quadratic_scene.py   #   QuadraticScene(ThemedScene) + make_quadratic_scene(a, b, c, theme=..., **show)
│   └── render.py            #   render_quadratic(...)
├── html/
│   ├── quadratic_page.py    #   build_quadratic_html(a, b, c, theme=...)
│   ├── templates/quadratic.html
│   └── static/
│       ├── quadratic_math.js   # browser mirror of solver.py (published as the API module)
│       ├── forms_math.js       # browser mirror of forms.py
│       ├── quadratic.js        # page controller (builds a Manim.Timeline)
│       └── quadratic.css
├── style.py                 # element → theme role (curve=primary, roots=highlight, vertex=point, ...)
├── api.py                   # TOPIC: what gets published to the API
├── tests/                   # solver, page, and JS-vs-Python parity
└── __main__.py              # CLI
```

## Usage

Run from the repo root (the folder that contains `a1/`) with `uv run`, or with `.venv` activated. `general/` comes from the portfolio-projects package that `uv sync` installs.

```bash
python -m a1 solve 1 -3 2                  # every calculation as JSON
python -m a1 html  1 -3 2                  # → a1/output/quadratic.html (portfolio theme)
python -m a1 html  1 2 5 --theme manim     # dark Manim look
python -m a1 video 1 -3 2                  # Manim render (needs Manim; see general/README.md)
python -m a1 all   1 -3 2                  # video + page with the video embedded
```

```python
from a1.solver import solve
from a1.html import build_quadratic_html
from a1.animations import render_quadratic

solve(1, -3, 2).roots
build_quadratic_html(1, -3, 2, "a1/output/quadratic.html", theme="portfolio")
render_quadratic(1, 2, 5, theme="manim", grid=False)
```

With the Manim CLI directly:

```bash
A1_A=1 A1_B=-3 A1_C=2 A1_THEME=portfolio manim -pql a1/animations/quadratic_scene.py QuadraticScene
```

### Page options

- **Start from**: standard (a, b, c), vertex (a, h, k) or factored (a, r₁, r₂) form, with sliders and number inputs. `a = 0` shows the line the parabola flattens into.
- **Presets**: two roots, one repeated root, complex roots, completing the square, vertex form, from the roots.
- **Show** (gear menu): grid, labels, axis of symmetry, vertex, y-intercept, roots.
- **Playback**: run/play/pause, show final, scrubber, speed 0.5×/1×/2×.
- **Deep links**: `quadratic.html#a=1&b=2&c=5`, `#a=2&h=1&k=-8` or `#a=-1&r1=-1&r2=5`. The page watches the hash, so `PP.embed(...).set({...})` updates it live.

## Tests

```bash
uv run pytest               # from the repo root: general/ and every topic
```
