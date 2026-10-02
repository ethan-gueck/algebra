# a1: Quadratic Formula (template topic)

Solves and visualises **ax² + bx + c = 0**:

$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

From one set of calculations this topic produces:

- **Interactive HTML**: a Manim-style animated page in the portfolio theme, with sliders, toggles and step-by-step working.
- **Manim video**: a real Manim render in the same theme.
- **API module + page**: published to GitHub Pages, so any site can call `solve()` or embed the page (see [general/README.md](https://github.com/ethan-gueck/portfolio-projects/tree/main/general#static-api-github-pages)).

Shared themes, CSS/JS, plotting, Manim helpers and the page builder live in [`general/`](https://github.com/ethan-gueck/portfolio-projects/tree/main/general). This folder holds only what is specific to quadratics.

## Layout

```
a1/
├── solver.py                # built on ../core/formula.py (A1.11, A1.12): roots, text forms, plot window, solve()
├── animations/
│   ├── quadratic_scene.py   #   QuadraticScene(ThemedScene) + make_quadratic_scene(a, b, c, theme=..., **show)
│   └── render.py            #   render_quadratic(...)
├── html/
│   ├── quadratic_page.py    #   build_quadratic_html(a, b, c, theme=...)
│   ├── templates/quadratic.html
│   └── static/
│       ├── quadratic_math.js   # browser mirror of solver.py (published as the API module)
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

- **Coefficients**: sliders and number inputs. `a = 0` is rejected.
- **Presets**: two roots, one repeated root, complex roots, opens down.
- **Show**: grid, labels, axis of symmetry, vertex, y-intercept, roots.
- **Playback**: run/play/pause, show final, scrubber, speed 0.5×/1×/2×.
- **Deep links**: `quadratic.html#a=1&b=2&c=5`. The page watches the hash, so `PP.embed(...).set({...})` updates it live.

## Tests

```bash
uv run pytest               # from the repo root: general/ and every topic
```
