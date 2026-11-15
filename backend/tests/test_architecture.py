"""Architecture boundary tests enforcing strict Hexagonal inward dependencies."""

import ast
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent / "app"

FORBIDDEN_EXTERNAL_IN_DOMAIN = {
    "fastapi",
    "pydantic",
    "pydantic_settings",
    "httpx",
    "starlette",
    "uvicorn",
    "sqlalchemy",
}


def _collect_imports(py_file: Path) -> set[str]:
    tree = ast.parse(py_file.read_text(encoding="utf-8"), filename=str(py_file))
    imports: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                imports.add(alias.name)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imports.add(node.module)
    return imports


def test_domain_has_zero_outer_layer_or_framework_imports() -> None:
    domain_dir = APP_DIR / "domain"
    for py_file in domain_dir.rglob("*.py"):
        imports = _collect_imports(py_file)
        for mod in imports:
            top = mod.split(".")[0]
            assert top not in FORBIDDEN_EXTERNAL_IN_DOMAIN, (
                f"{py_file.name} imports forbidden framework module {mod!r}"
            )
            assert not mod.startswith("app.application"), (
                f"{py_file.name} imports app.application ({mod!r})"
            )
            assert not mod.startswith("app.infrastructure"), (
                f"{py_file.name} imports app.infrastructure ({mod!r})"
            )
            assert not mod.startswith("app.presentation"), (
                f"{py_file.name} imports app.presentation ({mod!r})"
            )


def test_application_never_imports_infrastructure_or_presentation() -> None:
    app_layer_dir = APP_DIR / "application"
    for py_file in app_layer_dir.rglob("*.py"):
        imports = _collect_imports(py_file)
        for mod in imports:
            assert not mod.startswith("app.infrastructure"), (
                f"{py_file.name} imports app.infrastructure ({mod!r})"
            )
            assert not mod.startswith("app.presentation"), (
                f"{py_file.name} imports app.presentation ({mod!r})"
            )
            top = mod.split(".")[0]
            assert top not in {"fastapi", "httpx", "starlette", "uvicorn"}, (
                f"{py_file.name} imports web/HTTP module {mod!r}"
            )
