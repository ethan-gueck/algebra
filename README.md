# Algebra

The Algebra domain of [Ethan's NN](https://ethan-gueck.github.io/#nn): formulas built out as interactive pages, published at **https://ethan-gueck.github.io/algebra/**.

**The Python in [`core/formula.py`](core/formula.py) is handwritten by Ethan Gueck.** The topic folders around it (solvers, pages and tests) are scaffolding that calls it.

Flashcard decks in this track: Algebra I, Algebra II. A neuron on the portfolio fills in once a topic here lists its card id in `cards`, and its **See how it works** button opens the topic's page.

## Site health

![Published site size against the 1 GB GitHub Pages limit](https://ethan-gueck.github.io/algebra/health.svg)

The bar is the cumulative size of every file in the published site, where 100% is 1 GB, the most GitHub Pages will publish. [`.github/site_health.py`](.github/site_health.py) redraws it on every deploy.

## Topics

| Folder | Page | Flashcards |
| --- | --- | --- |
| [`real_numbers/`](real_numbers/) | [Real Numbers, Exponents, Radicals & Ratios](https://ethan-gueck.github.io/algebra/real_numbers/properties.html) | A1.1, A1.2, A1.3, A1.14 |
| [`slope/`](slope/) | [Slope](https://ethan-gueck.github.io/algebra/slope/slope.html) | A1.4 |
| [`lines/`](lines/) | [Equations of a Line & Linear Inequalities](https://ethan-gueck.github.io/algebra/lines/lines.html) | A1.5, A1.15 |
| [`factoring/`](factoring/) | [Special Products & Factoring](https://ethan-gueck.github.io/algebra/factoring/factoring.html) | A1.9, A1.10 |
| [`variation/`](variation/) | [Direct & Inverse Variation](https://ethan-gueck.github.io/algebra/variation/variation.html) | A1.13 |
| [`a1/`](a1/) | [Quadratic Formula & Vertex Form](https://ethan-gueck.github.io/algebra/a1/quadratic.html) | A1.11, A1.12 |
| [`complex_numbers/`](complex_numbers/) | [Complex Numbers](https://ethan-gueck.github.io/algebra/complex_numbers/complex_numbers.html) | A2.3 |

## Layout

```
algebra/
├── <topic>/                  one folder per topic
├── core/formula.py           every neuron's mathematics, in flashcard order A1.1 … A2.15 (empty sections until built)
├── tests/test_site.py        the site builds; topic cards are flashcard ids
├── pyproject.toml            [tool.portfolio-site]: site title and URL
├── .github/workflows/pages.yml   test, build and deploy on every push to main
└── .github/site_health.py      draws the published-site size bar shown above, on every deploy
```

Themes, styles, the page builder and the static API come from the shared [portfolio-projects](https://github.com/ethan-gueck/portfolio-projects) library (`general/`), installed from git.

```bash
uv sync                                   # install into .venv
uv run pytest                             # tests
uv run python -m general serve --port 8001   # build _site/ and preview it at http://localhost:8001
uv lock --upgrade-package portfolio-projects # pick up changes to general/
```
