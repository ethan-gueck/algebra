"""Command line entry point.

    python -m a1 solve 1 -3 2                # print the calculations as JSON
    python -m a1 html  1 -3 2                # interactive page -> output/quadratic.html
    python -m a1 video 1 -3 2 --quality high_quality
    python -m a1 all   1 -3 2                # video + page with the video embedded
    python -m a1 html  1 2 5 --theme manim   # any general.themes theme (default: portfolio)

Run from the folder that contains a1/ (the algebra repo root).
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from general.themes import THEMES

from .core import solve
from .html import build_quadratic_html
from .html.quadratic_page import DEFAULT_OUTPUT


def _coefficients(parser: argparse.ArgumentParser) -> None:
    parser.add_argument("a", type=float)
    parser.add_argument("b", type=float)
    parser.add_argument("c", type=float)


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(prog="python -m a1", description="Quadratic formula calculations, pages and animations.")
    sub = parser.add_subparsers(dest="command", required=True)

    _coefficients(sub.add_parser("solve", help="print every calculation as JSON"))

    html = sub.add_parser("html", help="build the interactive HTML page")
    _coefficients(html)
    html.add_argument("-o", "--output", type=Path, default=DEFAULT_OUTPUT)
    html.add_argument("--theme", choices=sorted(THEMES))

    for name, help_text in (("video", "render the Manim animation"), ("all", "render the video and a page embedding it")):
        cmd = sub.add_parser(name, help=help_text)
        _coefficients(cmd)
        cmd.add_argument("--quality", default="low_quality")
        cmd.add_argument("--gif", action="store_true", help="render a gif instead of mp4")
        cmd.add_argument("--preview", action="store_true", help="open the result when done")
        cmd.add_argument("--theme", choices=sorted(THEMES))
        if name == "all":
            cmd.add_argument("-o", "--output", type=Path, default=DEFAULT_OUTPUT)

    args = parser.parse_args(argv)

    if args.command == "solve":
        print(json.dumps(solve(args.a, args.b, args.c).to_dict(), indent=2))
        return

    if args.command == "html":
        print(build_quadratic_html(args.a, args.b, args.c, args.output, theme=args.theme))
        return

    from .animations import render_quadratic

    video = render_quadratic(
        args.a, args.b, args.c, theme=args.theme, quality=args.quality, fmt="gif" if args.gif else "mp4", preview=args.preview
    )
    print(video)
    if args.command == "all":
        output = args.output.resolve()
        video_src = Path(os.path.relpath(video, output.parent)).as_posix()
        print(build_quadratic_html(args.a, args.b, args.c, output, theme=args.theme, video_src=video_src))


if __name__ == "__main__":
    main()
