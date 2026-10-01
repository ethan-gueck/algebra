# Algebra

The Algebra domain of [Ethan's NN](https://ethan-gueck.github.io/#nn): formulas built out as interactive pages, published at **https://ethan-gueck.github.io/algebra/**.

Flashcard decks in this track: Algebra I, Algebra II. A neuron on the portfolio fills in once a topic here lists its card id in `cards`, and its **See how it works** button opens the topic's page.

## Topics

| Folder | Page | Flashcards |
| --- | --- | --- |
| [`real_numbers/`](real_numbers/) | [Properties of Real Numbers](https://ethan-gueck.github.io/algebra/real_numbers/properties.html) | A1.1 |
| [`slope/`](slope/) | [Slope](https://ethan-gueck.github.io/algebra/slope/slope.html) | A1.4 |
| [`lines/`](lines/) | [Equations of a Line](https://ethan-gueck.github.io/algebra/lines/lines.html) | A1.5 |
| [`a1/`](a1/) | [Quadratic Formula](https://ethan-gueck.github.io/algebra/a1/quadratic.html) | A1.11 |

## Layout

```
algebra/
├── <topic>/                  one folder per topic (see "Adding a topic")
├── tests/test_site.py        the site builds; topic cards are flashcard ids
├── pyproject.toml            [tool.portfolio-site]: site title and URL
└── .github/workflows/pages.yml   test, build and deploy on every push to main
```

Themes, styles, the page builder and the static API come from the shared [portfolio-projects](https://github.com/ethan-gueck/portfolio-projects) library (`general/`), installed from git.

```bash
uv sync                                   # install into .venv
uv run pytest                             # tests
uv run python -m general serve --port 8001   # build _site/ and preview it at http://localhost:8001
uv lock --upgrade-package portfolio-projects # pick up changes to general/
```

## Adding a topic

1. Copy [`a1/`](https://github.com/ethan-gueck/algebra/tree/main/a1) from the algebra repo into this repo and rename it (the folder name becomes the page's path, e.g. `https://ethan-gueck.github.io/algebra/<topic>/`).
2. Put the mathematical concept in `core/formula.py`, written the way it reads, with no input checks, rounding cleanup or formatting. Build the solver around it in `core/<topic>.py`, mirror that in `html/static/<topic>_math.js`, and keep the parity test.
3. In `api.py`, set the title, pages and `cards=("A1.11",)` to the flashcards the page covers.
   The "View the code" popup shows only `core/formula.py`: pass `code=(CodeFile(core / "formula.py", "…"),)` to `render_page` and put `{{code_button}}` in the template.
4. Push to `main`. The workflow tests, builds and deploys, and the neuron fills in on the portfolio.
